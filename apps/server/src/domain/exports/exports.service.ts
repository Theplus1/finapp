import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import XlsxPopulate = require('xlsx-populate');
import {
  ExportJob,
  ExportJobDoc,
  ExportStatus,
  ExportType,
} from 'src/database/schemas/export-job.schema';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportJobResponseDto } from './dto/export-job-response.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { saveExportFile } from './helpers/export-file.helper';
import { format } from 'date-fns';

interface WebTransactionExportParams {
  userId: string;
  virtualAccountId: string;
  type: ExportType.TRANSACTIONS;
  filters: Record<string, unknown>;
}

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    @InjectModel(ExportJob.name)
    private readonly exportJobModel: Model<ExportJobDoc>,
    @InjectQueue('exports')
    private readonly exportQueue: Queue,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async createExport(
    userId: number,
    chatId: number,
    createExportDto: CreateExportDto,
  ): Promise<ExportJobResponseDto> {
    // Create job record
    const job = await this.exportJobModel.create({
      userId,
      chatId,
      type: createExportDto.type,
      status: ExportStatus.PENDING,
      filters: createExportDto.filters || {},
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Add to queue
    await this.exportQueue.add(
      'generate',
      {
        jobId: job._id.toString(),
        userId,
        chatId,
        type: createExportDto.type,
        filters: createExportDto.filters || {},
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(`Export job created: ${job._id} for user ${userId}`);

    return this.toResponseDto(job);
  }

  async getJobStatus(jobId: string, userId: number): Promise<ExportJobResponseDto> {
    const job = await this.exportJobModel.findOne({
      _id: jobId,
      userId,
    });

    if (!job) {
      throw new NotFoundException('Export job not found');
    }

    return this.toResponseDto(job);
  }

  async getUserJobs(userId: number, limit = 10): Promise<ExportJobResponseDto[]> {
    const jobs = await this.exportJobModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    return jobs.map((job) => this.toResponseDto(job));
  }

  async generateDownloadToken(jobId: string, userId: number): Promise<string> {
    const job = await this.exportJobModel.findOne({
      _id: jobId,
      userId,
      status: ExportStatus.COMPLETED,
    });

    if (!job) {
      throw new NotFoundException('Export job not found or not ready');
    }

    if (job.expiresAt && job.expiresAt < new Date()) {
      throw new NotFoundException('Export has expired');
    }

    const token = this.jwtService.sign(
      {
        jobId: job._id.toString(),
        userId: job.userId,
        type: 'export-download',
      },
      {
        expiresIn: '24h',
      },
    );

    return token;
  }

  async getDownloadUrl(jobId: string, userId: number): Promise<string> {
    const token = await this.generateDownloadToken(jobId, userId);
    let baseUrl = this.configService.get<string>('resourceBaseUrl', 'http://localhost:3000');
    
    // Ensure baseUrl has protocol
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `http://${baseUrl}`;
    }
    
    // Remove trailing slash if present
    baseUrl = baseUrl.replace(/\/$/, '');
    
    return `${baseUrl}/api/exports/download/${token}`;
  }

  async markAsDownloaded(jobId: string): Promise<void> {
    await this.exportJobModel.updateOne(
      { _id: jobId },
      {
        $set: { downloadedAt: new Date() },
        $inc: { downloadCount: 1 },
      },
    );
  }

  async updateJobStatus(
    jobId: string,
    status: ExportStatus,
    data?: Partial<ExportJob>,
  ): Promise<void> {
    await this.exportJobModel.updateOne(
      { _id: jobId },
      {
        $set: {
          status,
          ...data,
        },
      },
    );
  }

  async cleanupExpiredJobs(): Promise<number> {
    const now = new Date();
    const expiredJobs = await this.exportJobModel.find({
      expiresAt: { $lt: now },
    });

    let deletedCount = 0;

    for (const job of expiredJobs) {
      try {
        // Delete file if exists
        if (job.filePath) {
          const fs = await import('fs-extra');
          if (await fs.pathExists(job.filePath)) {
            await fs.remove(job.filePath);
            this.logger.log(`Deleted expired file: ${job.filePath}`);
          }
        }

        // Delete job record
        await this.exportJobModel.deleteOne({ _id: job._id });
        deletedCount++;
      } catch (error) {
        this.logger.error(`Failed to cleanup job ${job._id}:`, error);
      }
    }

    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} expired export jobs`);
    }

    return deletedCount;
  }

  async generateTransactionExportDownloadUrlForWeb(
    params: WebTransactionExportParams,
  ): Promise<{
    downloadUrl: string;
    fileName: string;
    expiresAt: Date;
  }> {
    const ownerId = this.toNumericOwnerId(params.userId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const exportJob = await this.exportJobModel.create({
      userId: ownerId,
      chatId: ownerId,
      type: ExportType.TRANSACTIONS,
      status: ExportStatus.PROCESSING,
      filters: params.filters,
      expiresAt,
    });

    try {
      const [transactions] = await this.transactionsService.findAllWithFiltersAndPagination(
        params.filters,
        { page: 1, limit: 10000 },
      );

      const headers = [
        'No',
        'Transaction ID',
        'Card',
        'Amount',
        'Status',
        'Description',
        'Merchant',
        'Country',
        'Date',
      ];
      const rows = transactions.map((transaction, index) => {
        const cardName = transaction.card
          ? `${transaction.card.name ?? ''} ${transaction.card.last4 ?? ''}`.trim()
          : (transaction.cardId ?? '');
        const merchant =
          transaction.merchantData?.description ??
          transaction.merchantData?.name ??
          '';
        const country = transaction.merchantData?.location?.country ?? '';
        const dateValue = transaction.date
          ? format(new Date(transaction.date), 'yyyy-MM-dd HH:mm:ss')
          : '';
        return [
          index + 1,
          transaction.slashId ?? '',
          cardName,
          Number((transaction.amountCents / 100).toFixed(2)),
          (transaction.detailedStatus ?? transaction.status ?? '').toUpperCase(),
          transaction.description ?? '',
          merchant,
          country,
          dateValue,
        ];
      });

      const workbook = await XlsxPopulate.fromBlankAsync();
      const sheet = workbook.sheet(0);
      sheet.name('Transactions');
      headers.forEach((header, colIndex) => {
        const cell = sheet.cell(1, colIndex + 1);
        cell.value(header);
        cell.style('bold', true);
      });
      rows.forEach((row, rowIndex) => {
        row.forEach((value, colIndex) => {
          sheet.cell(rowIndex + 2, colIndex + 1).value(value);
        });
      });
      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        const columnLetter = String.fromCharCode(65 + colIndex);
        sheet.column(columnLetter).width(20);
      }

      const buffer = (await workbook.outputAsync()) as Buffer;
      const { fileName, filePath } = await saveExportFile(buffer, 'transactions-web');
      const fileStats = await fs.stat(filePath);
      await this.exportJobModel.updateOne(
        { _id: exportJob._id },
        {
          $set: {
            status: ExportStatus.COMPLETED,
            fileName,
            filePath,
            fileSize: fileStats.size,
            recordCount: rows.length,
          },
        },
      );

      const token = this.jwtService.sign(
        {
          jobId: exportJob._id.toString(),
          type: 'export-download',
        },
        {
          expiresIn: '24h',
        },
      );
      const downloadUrl = this.buildDownloadUrlFromToken(token);
      return {
        downloadUrl,
        fileName,
        expiresAt,
      };
    } catch (error) {
      await this.exportJobModel.updateOne(
        { _id: exportJob._id },
        {
          $set: {
            status: ExportStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        },
      );
      throw error;
    }
  }

  private buildDownloadUrlFromToken(token: string): string {
    let baseUrl = this.configService.get<string>('resourceBaseUrl', 'http://localhost:3000');
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `http://${baseUrl}`;
    }
    baseUrl = baseUrl.replace(/\/$/, '');
    return `${baseUrl}/api/exports/download/${token}`;
  }

  private toNumericOwnerId(rawId: string): number {
    const parsed = Number(rawId);
    if (Number.isFinite(parsed)) {
      return Math.abs(Math.trunc(parsed));
    }

    let hash = 0;
    for (let index = 0; index < rawId.length; index++) {
      hash = ((hash << 5) - hash + rawId.charCodeAt(index)) | 0;
    }
    return Math.abs(hash) || 1;
  }

  private toResponseDto(job: ExportJobDoc): ExportJobResponseDto {
    return {
      id: job._id.toString(),
      userId: job.userId,
      type: job.type,
      status: job.status,
      fileName: job.fileName,
      fileSize: job.fileSize,
      recordCount: job.recordCount,
      errorMessage: job.errorMessage,
      expiresAt: job.expiresAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
