import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GoogleSheetReportAllDocument = GoogleSheetReportAll & Document;

/**
 * Google Sheet Report All Schema
 * Stores mapping information between Virtual Accounts and Google Sheets for full data sync
 * One sheet per Virtual Account (not divided by month)
 */
@Schema({ timestamps: true, collection: 'ggsheetReportAlls' })
export class GoogleSheetReportAll {
  @Prop({ required: true })
  sheetId: string; // Google Spreadsheet ID

  @Prop()
  sheetName?: string; // Name of the spreadsheet (optional, can be fetched from Google Sheets API)

  @Prop({ required: true, unique: true, index: true })
  virtualAccountId: string; // Slash virtual account ID

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

export const GoogleSheetReportAllSchema = SchemaFactory.createForClass(GoogleSheetReportAll);

// Index cho sheetId
GoogleSheetReportAllSchema.index({ sheetId: 1 });

