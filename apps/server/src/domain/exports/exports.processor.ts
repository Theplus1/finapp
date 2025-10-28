import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as fs from 'fs-extra';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { ExportJob, ExportJobDoc, ExportStatus, ExportType } from 'src/database/schemas/export-job.schema';
import { ExportsService } from './exports.service';
import { ExportGeneratorsService } from './services/export-generators.service';
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
    private readonly exportGeneratorsService: ExportGeneratorsService,
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
        return this.exportGeneratorsService.generateTransactionsExport(filters);
      case ExportType.CARDS:
        return this.exportGeneratorsService.generateCardsExport(filters);
      default:
        throw new Error(`Unsupported export type: ${type}`);
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
