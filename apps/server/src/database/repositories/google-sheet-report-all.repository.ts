import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GoogleSheetReportAll, GoogleSheetReportAllDocument } from '../schemas/google-sheet-report-all.schema';

@Injectable()
export class GoogleSheetReportAllRepository {
  private readonly logger = new Logger(GoogleSheetReportAllRepository.name);

  constructor(
    @InjectModel(GoogleSheetReportAll.name)
    private googleSheetReportAllModel: Model<GoogleSheetReportAllDocument>,
  ) {}

  async create(reportData: Partial<GoogleSheetReportAll>): Promise<GoogleSheetReportAllDocument> {
    const report = new this.googleSheetReportAllModel(reportData);
    return report.save();
  }

  async upsert(
    virtualAccountId: string,
    reportData: Partial<GoogleSheetReportAll>,
  ): Promise<GoogleSheetReportAllDocument> {
    return this.googleSheetReportAllModel.findOneAndUpdate(
      { virtualAccountId },
      reportData,
      { upsert: true, new: true },
    ).exec();
  }

  async findByVirtualAccountId(virtualAccountId: string): Promise<GoogleSheetReportAllDocument | null> {
    return this.googleSheetReportAllModel
      .findOne({ virtualAccountId })
      .exec();
  }

  async findBySheetId(sheetId: string): Promise<GoogleSheetReportAllDocument | null> {
    return this.googleSheetReportAllModel
      .findOne({ sheetId })
      .exec();
  }

  async findAll(): Promise<GoogleSheetReportAllDocument[]> {
    return this.googleSheetReportAllModel
      .find()
      .sort({ virtualAccountId: 1 })
      .exec();
  }

  async delete(virtualAccountId: string): Promise<boolean> {
    const result = await this.googleSheetReportAllModel
      .deleteOne({ virtualAccountId })
      .exec();
    return result.deletedCount > 0;
  }
}



