import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GoogleSheetReport, GoogleSheetReportDocument } from '../schemas/google-sheet-report.schema';

@Injectable()
export class GoogleSheetReportRepository {
  private readonly logger = new Logger(GoogleSheetReportRepository.name);

  constructor(
    @InjectModel(GoogleSheetReport.name)
    private googleSheetReportModel: Model<GoogleSheetReportDocument>,
  ) {}

  async create(reportData: Partial<GoogleSheetReport>): Promise<GoogleSheetReportDocument> {
    const report = new this.googleSheetReportModel(reportData);
    return report.save();
  }

  async upsert(
    virtualAccountId: string,
    month: number,
    year: number,
    reportData: Partial<GoogleSheetReport>,
  ): Promise<GoogleSheetReportDocument> {
    return this.googleSheetReportModel.findOneAndUpdate(
      { virtualAccountId, month, year },
      reportData,
      { upsert: true, new: true },
    ).exec();
  }

  async findByVirtualAccountIdAndMonth(
    virtualAccountId: string,
    month: number,
    year: number,
  ): Promise<GoogleSheetReportDocument | null> {
    return this.googleSheetReportModel
      .findOne({ virtualAccountId, month, year })
      .exec();
  }

  async findByVirtualAccountId(virtualAccountId: string): Promise<GoogleSheetReportDocument[]> {
    return this.googleSheetReportModel
      .find({ virtualAccountId })
      .sort({ year: -1, month: -1 })
      .exec();
  }

  async findBySheetId(sheetId: string): Promise<GoogleSheetReportDocument | null> {
    return this.googleSheetReportModel
      .findOne({ sheetId })
      .exec();
  }

  async findAll(): Promise<GoogleSheetReportDocument[]> {
    return this.googleSheetReportModel
      .find()
      .sort({ year: -1, month: -1, virtualAccountId: 1 })
      .exec();
  }

  async delete(virtualAccountId: string, month: number, year: number): Promise<boolean> {
    const result = await this.googleSheetReportModel
      .deleteOne({ virtualAccountId, month, year })
      .exec();
    return result.deletedCount > 0;
  }
}

