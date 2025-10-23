import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs-extra';
import { ExportJob, ExportJobDoc, ExportStatus } from 'src/database/schemas/export-job.schema';
import { ExportsService } from './exports.service';

@Controller('api/exports')
export class ExportsController {
  constructor(
    @InjectModel(ExportJob.name)
    private readonly exportJobModel: Model<ExportJobDoc>,
    private readonly exportsService: ExportsService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('download/:token')
  @UseInterceptors() // Skip global interceptors for file download
  async downloadExport(
    @Param('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Verify token
      const payload = this.jwtService.verify(token);

      if (payload.type !== 'export-download') {
        throw new UnauthorizedException('Invalid token type');
      }

      const { jobId, userId } = payload;

      // Get job
      const job = await this.exportJobModel.findOne({
        _id: jobId,
        userId,
        status: ExportStatus.COMPLETED,
      });

      if (!job) {
        throw new NotFoundException('Export not found or not ready');
      }

      // Check expiration
      if (job.expiresAt && job.expiresAt < new Date()) {
        throw new NotFoundException('Export has expired');
      }

      // Check if file exists
      if (!job.filePath || !(await fs.pathExists(job.filePath))) {
        throw new NotFoundException('Export file not found');
      }

      // Mark as downloaded
      await this.exportsService.markAsDownloaded(jobId);

      // Read file
      const fileBuffer = await fs.readFile(job.filePath);

      // Set headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${job.fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length.toString());
      res.setHeader('Cache-Control', 'no-cache');

      // Send file
      res.send(fileBuffer);
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
          error: { code: 'Unauthorized' },
        });
        return;
      }
      
      if (error instanceof NotFoundException) {
        res.status(404).json({
          success: false,
          message: error.message,
          error: { code: 'Not Found' },
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: { code: 'Internal Server Error' },
      });
    }
  }

  @Get(':jobId/status')
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.exportJobModel.findById(jobId);

    if (!job) {
      throw new NotFoundException('Export job not found');
    }

    return {
      id: job._id.toString(),
      status: job.status,
      fileName: job.fileName,
      recordCount: job.recordCount,
      errorMessage: job.errorMessage,
      expiresAt: job.expiresAt,
    };
  }
}
