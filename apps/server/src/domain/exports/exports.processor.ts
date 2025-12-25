import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as fs from 'fs-extra';
import XlsxPopulate = require('xlsx-populate');
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { ExportJob, ExportJobDoc, ExportStatus, ExportType } from 'src/database/schemas/export-job.schema';
import { ExportsService } from './exports.service';
import { ExportSheetsService } from './services/export-sheets.service';
import { CardsExportSheetService } from './services/cards-export-sheet.service';
import { saveExportFile, formatFileSize } from './helpers/export-file.helper';
import { BotContext } from 'src/bot/interfaces/bot-context.interface';

interface ExportJobData {
  jobId: string;
  userId: number;
  chatId: number;
  type: ExportType;
  filters: Record<string, any>;
}

@Processor('exports')
export class ExportsProcessor {
  private readonly logger = new Logger(ExportsProcessor.name);

  constructor(
    private readonly exportsService: ExportsService,
    private readonly exportSheetsService: ExportSheetsService,
    private readonly cardsExportSheetService: CardsExportSheetService,
    @InjectBot() private readonly bot: Telegraf<BotContext>,
  ) {}

  @Process('generate')
  async handleExportGeneration(job: Job<ExportJobData>) {
    const { jobId, userId, chatId, type, filters } = job.data;

    this.logger.log(`Processing export job ${jobId} for user ${userId}`);

    try {
      await this.exportsService.updateJobStatus(jobId, ExportStatus.PROCESSING);

      const result = await this.generateExport(type, filters);
      const fileStats = await fs.stat(result.filePath);

      await this.completeExportJob(jobId, result, fileStats.size);
      await this.notifyUser(jobId, userId, chatId, result, fileStats.size);

      this.logger.log(`Export job ${jobId} completed successfully`);
    } catch (error) {
      await this.handleExportFailure(jobId, chatId, error);
      throw error;
    }
  }

  private async generateExport(type: ExportType, filters: Record<string, any>) {
    const exportResult = await this.generateExportByType(type, filters);
    const { filePath, fileName } = await saveExportFile(
      exportResult.buffer,
      type.toLowerCase(),
    );

    return {
      filePath,
      fileName,
      recordCount: exportResult.recordCount,
    };
  }

  private async generateExportByType(type: ExportType, filters: Record<string, any>) {
    switch (type) {
      case ExportType.TRANSACTIONS:
        return this.generateTransactionsExportWithSheets(filters);
      case ExportType.CARDS:
        return this.generateCardsExportWithSheets(filters);
      default:
        throw new Error(`Unsupported export type: ${type}`);
    }
  }

  private async generateTransactionsExportWithSheets(filters: Record<string, any>) {
    const sheets = await this.exportSheetsService.generateAllSheets(filters);
    const buffer = await this.sheetsToExcel(sheets);

    const totalRecords = sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0);

    return {
      buffer,
      recordCount: totalRecords,
    };
  }

  private async generateCardsExportWithSheets(filters: Record<string, any>) {
    const virtualAccountId = filters.virtualAccountId;
    const [cards, total] = await this.cardsExportSheetService.findAllCards(virtualAccountId);
    
    const sheet = this.cardsExportSheetService.generateCardsSheet(cards);
    const buffer = await this.sheetsToExcel([sheet]);

    return {
      buffer,
      recordCount: total,
    };
  }

  private async sheetsToExcel(sheets: any[]): Promise<Buffer> {
    const workbook = await XlsxPopulate.fromBlankAsync();

    for (let index = 0; index < sheets.length; index++) {
      const { name, headers, rows, columnStyles } = sheets[index];

      const sheet = index === 0 ? workbook.sheet(0) : workbook.addSheet(name);
      if (index === 0) {
        sheet.name(name);
      }

      this.writeSheetHeaders(sheet, headers);
      this.writeSheetRows(sheet, rows, columnStyles);
      this.setSheetColumnWidths(sheet, headers.length);
    }

    const buffer = await workbook.outputAsync();
    return buffer as Buffer;
  }

  private writeSheetHeaders(sheet: any, headers: string[]): void {
    headers.forEach((header, colIndex) => {
      const cell = sheet.cell(1, colIndex + 1);
      cell.value(header);
      cell.style('bold', true);
    });
  }

  private writeSheetRows(sheet: any, rows: any[][], columnStyles?: Record<string, any>): void {
    rows.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        const cell = sheet.cell(rowIndex + 2, colIndex + 1);
        const columnLetter = String.fromCharCode(65 + colIndex);
        
        // Apply format BEFORE writing value
        if (columnStyles && columnStyles[columnLetter]) {
          const styleSpec = columnStyles[columnLetter];
          if (typeof styleSpec === 'string') {
            cell.style('numberFormat', styleSpec);
          }
        }
        
        if (value && typeof value === 'object' && value.formula) {
          cell.formula(value.formula);
        } else {
          cell.value(value ?? '');
        }
      });
    });
  }

  private applyColumnStyles(sheet: any, columnStyles: Record<string, any>): void {
    Object.entries(columnStyles).forEach(([column, styleSpec]) => {
      if (typeof styleSpec === 'string') {
        // Simple format string: apply numberFormat to entire column
        const columnObj = sheet.column(column);
        if (columnObj && columnObj.style) {
          columnObj.style('numberFormat', styleSpec);
        }
      } else if (styleSpec.styles) {
        // Style object with styles property
        const target = styleSpec.range ? sheet.range(styleSpec.range) : sheet.column(column);
        if (target && target.style) {
          Object.entries(styleSpec.styles).forEach(([styleKey, styleValue]) => {
            target.style(styleKey, styleValue);
          });
        }
      }
    });
  }

  private setSheetColumnWidths(sheet: any, columnCount: number): void {
    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
      const columnLetter = String.fromCharCode(65 + colIndex);
      sheet.column(columnLetter).width(15);
    }
  }

  private async completeExportJob(jobId: string, result: any, fileSize: number) {
    await this.exportsService.updateJobStatus(jobId, ExportStatus.COMPLETED, {
      fileName: result.fileName,
      filePath: result.filePath,
      fileSize,
    });
  }

  private async notifyUser(jobId: string, userId: number, chatId: number, result: any, fileSize: number) {
    const downloadUrl = await this.exportsService.getDownloadUrl(jobId, userId);
    const fileSizeFormatted = formatFileSize(fileSize);

    try {
      if (result.recordCount === 0) {
        await this.bot.telegram.sendMessage(chatId, 'No records found for your export request');
        return;
      }

      await this.bot.telegram.sendMessage(
        chatId,
        `✅ *Export Ready!*\n\n` +
        `📁 File: \`${result.fileName}\`\n` +
        `💾 Size: ${fileSizeFormatted}\n` +
        `⏰ Expires: 24 hours`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📥 Download File',
                  url: downloadUrl,
                },
              ],
            ],
          },
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to send download notification to user ${userId}: ${error.message}`);
    }
  }

  private async handleExportFailure(jobId: string, chatId: number, error: any) {
    this.logger.error(`Export job ${jobId} failed:`, error);

    await this.exportsService.updateJobStatus(jobId, ExportStatus.FAILED, {
      errorMessage: error.message || 'Unknown error',
    });

    try {
      await this.bot.telegram.sendMessage(
        chatId,
        `❌ *Export Failed*\n\nSorry, we couldn't generate your export. Please try again later.`,
        { parse_mode: 'Markdown' },
      );
    } catch (notifyError) {
      this.logger.error(`Failed to notify user of export failure:`, notifyError);
    }
  }

}
