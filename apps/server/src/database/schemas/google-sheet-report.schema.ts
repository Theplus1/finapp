import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GoogleSheetReportDocument = GoogleSheetReport & Document;

/**
 * Google Sheet Report Schema
 * Stores mapping information between Virtual Accounts and Google Sheets
 * User manually creates reports and links them to virtual accounts
 */
@Schema({ timestamps: true })
export class GoogleSheetReport {
  @Prop({ required: true })
  sheetId: string; // Google Spreadsheet ID

  @Prop({ required: true })
  sheetName: string; // Name of the spreadsheet

  @Prop({ required: true, index: true })
  virtualAccountId: string; // Slash virtual account ID

  @Prop({ required: true, index: true })
  month: number; // Month (1-12)

  @Prop({ required: true, index: true })
  year: number; // Year (e.g., 2025)

  @Prop()
  lastSyncedAt?: Date;

  @Prop()
  lastSyncStatus?: string; // 'success' | 'failed'

  @Prop()
  lastSyncError?: string;

  // Timestamps are automatically added by Mongoose when timestamps: true
  createdAt?: Date;
  updatedAt?: Date;
}

export const GoogleSheetReportSchema = SchemaFactory.createForClass(GoogleSheetReport);

// Unique index cho virtualAccountId + month + year
GoogleSheetReportSchema.index({ virtualAccountId: 1, month: 1, year: 1 }, { unique: true });

// Index cho sheetId
GoogleSheetReportSchema.index({ sheetId: 1 });

