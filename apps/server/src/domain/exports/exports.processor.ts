import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import * as path from 'path';
import * as fs from 'fs-extra';
import { TransactionsService } from '../transactions/transactions.service';
import { ExportJob, ExportJobDoc, ExportStatus, ExportType } from 'src/database/schemas/export-job.schema';
import { toCsvFromObjects } from 'src/shared/utils/csv.util';
import { buildTimestampedName } from 'src/shared/utils/naming.util';
import { publicPath } from 'src/shared/utils/file.util';
import { ExportsService } from './exports.service';
import { BotContext } from 'src/bot/interfaces/bot-context.interface';
import { CardsService } from '../cards/cards.service';

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
    @InjectModel(ExportJob.name)
    private readonly exportJobModel: Model<ExportJobDoc>,
    private readonly transactionsService: TransactionsService,
    private readonly cardsService: CardsService,
    private readonly exportsService: ExportsService,
    @InjectBot() private readonly bot: Telegraf<BotContext>,
  ) {}

  @Process('generate')
  async handleExportGeneration(job: Job<ExportJobData>) {
    const { jobId, userId, chatId, type, filters } = job.data;

    this.logger.log(`Processing export job ${jobId} for user ${userId}`);

    try {
      // Update status to processing
      await this.exportsService.updateJobStatus(jobId, ExportStatus.PROCESSING);

      // Generate export based on type
      let result: { filePath: string; fileName: string; recordCount: number };

      switch (type) {
        case ExportType.TRANSACTIONS:
          result = await this.generateTransactionsExport(filters);
          break;
        case ExportType.CARDS:
          result = await this.generateCardsExport(filters);
          break;
        default:
          throw new Error(`Unsupported export type: ${type}`);
      }

      if (!result) {
        throw new Error(`Failed to generate export for job ${jobId}`);
      }

      // Get file size
      const stats = await fs.stat(result.filePath);

      // Update job as completed FIRST (before notification)
      // This ensures the file is downloadable even if notification fails
      await this.exportsService.updateJobStatus(jobId, ExportStatus.COMPLETED, {
        fileName: result.fileName,
        filePath: result.filePath,
        fileSize: stats.size,
        recordCount: result.recordCount,
      });

      this.logger.log(`Export job ${jobId} completed successfully`);

      // Generate download URL
      const downloadUrl = await this.exportsService.getDownloadUrl(jobId, userId);

      // Try to notify user via bot (don't fail if this doesn't work)
      try {

        if (result.recordCount === 0) {
          await this.bot.telegram.sendMessage(chatId, 'No records found for your export request');
          return;
        }
        await this.bot.telegram.sendMessage(
          chatId,
          `✅ *Export Ready!*\n\n` +
            `📊 Records: ${result.recordCount}\n` +
            `📁 File: \`${result.fileName}\`\n` +
            `💾 Size: ${this.formatFileSize(stats.size)}\n` +
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
      } catch (notifyError) {
        this.logger.warn(`Failed to send download notification to user ${userId}: ${notifyError.message}`);
        // Job is still completed, just notification failed
      }
    } catch (error) {
      this.logger.error(`Export job ${jobId} failed:`, error);

      // Update job as failed
      await this.exportsService.updateJobStatus(jobId, ExportStatus.FAILED, {
        errorMessage: error.message || 'Unknown error',
      });

      // Notify user of failure
      try {
        await this.bot.telegram.sendMessage(
          chatId,
          `❌ *Export Failed*\n\nSorry, we couldn't generate your export. Please try again later.`,
          { parse_mode: 'Markdown' },
        );
      } catch (notifyError) {
        this.logger.error(`Failed to notify user of export failure:`, notifyError);
      }

      throw error;
    }
  }

  private async generateTransactionsExport(filters: Record<string, any>): Promise<{
    filePath: string;
    fileName: string;
    recordCount: number;
  }> {
    // Fetch transactions using existing service
    const transactions = await this.transactionsService.find({
      virtualAccountId: filters.virtualAccountId,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    });

    // Generate CSV using existing utility
    const csvData = toCsvFromObjects(transactions, [
      { key: 'id', header: 'id' },
      { key: 'date', header: 'date' },
      { key: 'status', header: 'status' },
      { key: 'type', header: 'type' },
      { key: 'amountCents', header: 'amountCents' },
      {
        key: 'currency',
        header: 'currency',
        map: (t) => t.originalCurrency?.code ?? '',
      },
      { key: 'merchantDescription', header: 'merchantDescription' },
      { key: 'merchantName', header: 'merchantName' },
      { key: 'merchantCategory', header: 'merchantCategory' },
      {
        key: 'country',
        header: 'country',
        map: (t) => t.merchantData?.location?.country ?? '',
      },
      {
        key: 'city',
        header: 'city',
        map: (t) => t.merchantData?.location?.city ?? '',
      },
    ]);

    // Generate filename
    const fileName = buildTimestampedName(new Date(), {
      prefix: 'transactions',
      ext: 'csv',
    });

    // Save to exports directory (separate from public transaction data)
    const outDir = publicPath('exports');
    await fs.ensureDir(outDir);

    const filePath = path.join(outDir, fileName);
    await fs.writeFile(filePath, csvData, 'utf8');

    return {
      filePath,
      fileName,
      recordCount: transactions.length,
    };
  }

  private async generateCardsExport(filters: Record<string, any>): Promise<{
    filePath: string;
    fileName: string;
    recordCount: number;
  }> {
    // Fetch transactions using existing service
    const [cards, total] = await this.cardsService.findAllWithFilters({
      virtualAccountId: filters.virtualAccountId,
    });

    // Generate CSV using existing utility
    const csvData = toCsvFromObjects(cards, [
      { key: 'slashId', header: 'id' },
      { key: 'name', header: 'name' },
      { key: 'status', header: 'status' },
      { key: 'last4', header: 'last4' },
      { key: 'expiryMonth', header: 'expiryMonth' },
      { key: 'expiryYear', header: 'expiryYear' }
    ]);

    // Generate filename
    const fileName = buildTimestampedName(new Date(), {
      prefix: 'cards',
      ext: 'csv',
    });

    // Save to exports directory (separate from public transaction data)
    const outDir = publicPath('exports');
    await fs.ensureDir(outDir);

    const filePath = path.join(outDir, fileName);
    await fs.writeFile(filePath, csvData, 'utf8');

    return {
      filePath,
      fileName,
      recordCount: total,
    };
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
