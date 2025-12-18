import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';

export interface SheetData {
  name: string;
  headers: string[];
  rows: any[][];
}

/**
 * Google Sheets Service
 * Handles all interactions with Google Sheets API
 */
@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private sheetsApi: sheets_v4.Sheets;
  private jwtClient: JWT;

  constructor(private readonly configService: ConfigService) {
    this.initializeAuth();
  }

  /**
   * Initialize authentication with Google APIs
   */
  private initializeAuth(): void {
    const keyFilePath = this.configService.get<string>(
      'googleSheets.keyFile',
      './google-credentials.json',
    );

    const absolutePath = path.resolve(process.cwd(), keyFilePath);
    this.logger.log(`Loading Google credentials from: ${absolutePath}`);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Google credentials file not found at: ${absolutePath}`);
    }

    const keyFile = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    this.logger.log(`Loaded credentials for service account: ${keyFile.client_email}`);
    this.logger.log(`Project ID: ${keyFile.project_id}`);

    if (!keyFile.client_email || !keyFile.private_key) {
      throw new Error('Invalid credentials file: missing client_email or private_key');
    }

    this.jwtClient = new google.auth.JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    this.sheetsApi = google.sheets({ version: 'v4', auth: this.jwtClient });

    this.logger.log('Google Sheets API initialized successfully');
  }

  /**
   * Create new spreadsheet
   * Note: File location management (folder creation/moving) is handled by Google Apps Script
   */
  async createSpreadsheet(title: string, sheets: SheetData[]): Promise<{ spreadsheetId: string; url: string }> {
    try {
      // Create spreadsheet
      const response = await this.sheetsApi.spreadsheets.create({
        requestBody: {
          properties: {
            title,
          },
          sheets: sheets.map((sheet) => ({
            properties: {
              title: sheet.name,
            },
          })),
        },
      });

      const spreadsheetId = response.data.spreadsheetId!;
      const url = response.data.spreadsheetUrl!;

      this.logger.log(`Created spreadsheet: ${title} (${spreadsheetId})`);

      // Write data to sheets
      await this.updateSheets(spreadsheetId, sheets);

      return { spreadsheetId, url };
    } catch (error) {
      this.logger.error(`Error creating spreadsheet: ${title}`, error);
      throw error;
    }
  }

  /**
   * Update data to spreadsheet (overwrite all)
   */
  async updateSheets(spreadsheetId: string, sheets: SheetData[]): Promise<void> {
    try {
      const requests: any[] = [];

      // Delete all old sheets (except first one)
      const spreadsheet = await this.sheetsApi.spreadsheets.get({ spreadsheetId });
      const existingSheets = spreadsheet.data.sheets || [];

      // Delete old sheets (except first one to avoid errors)
      for (let i = 1; i < existingSheets.length; i++) {
        requests.push({
          deleteSheet: {
            sheetId: existingSheets[i].properties?.sheetId,
          },
        });
      }

      // Rename first sheet to first sheet name in data
      if (sheets.length > 0 && existingSheets.length > 0) {
        requests.push({
          updateSheetProperties: {
            properties: {
              sheetId: existingSheets[0].properties?.sheetId,
              title: sheets[0].name,
            },
            fields: 'title',
          },
        });
      }

      // Create new sheets
      for (let i = 1; i < sheets.length; i++) {
        requests.push({
          addSheet: {
            properties: {
              title: sheets[i].name,
            },
          },
        });
      }

      // Execute batch update to create/delete sheets
      if (requests.length > 0) {
        await this.sheetsApi.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests },
        });
      }

      // Clear and write data to each sheet
      for (const sheet of sheets) {
        const range = `${sheet.name}!A1`;

        // Clear sheet
        await this.sheetsApi.spreadsheets.values.clear({
          spreadsheetId,
          range: `${sheet.name}!A:Z`,
        });

        // Write headers and data
        const values = [sheet.headers, ...sheet.rows];

        await this.sheetsApi.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'RAW',
          requestBody: { values },
        });

        // Format headers (bold)
        await this.formatHeaders(spreadsheetId, sheet.name);
      }

      this.logger.log(`Updated spreadsheet: ${spreadsheetId} with ${sheets.length} sheets`);
    } catch (error) {
      this.logger.error(`Error updating spreadsheet: ${spreadsheetId}`, error);
      throw error;
    }
  }

  /**
   * Format headers (bold, background color)
   */
  private async formatHeaders(spreadsheetId: string, sheetName: string): Promise<void> {
    try {
      const spreadsheet = await this.sheetsApi.spreadsheets.get({ spreadsheetId });
      const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === sheetName);

      if (!sheet || !sheet.properties?.sheetId) {
        return;
      }

      const sheetId = sheet.properties.sheetId;

      const requests = [
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.9,
                  green: 0.9,
                  blue: 0.9,
                },
                textFormat: {
                  bold: true,
                },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
      ];

      await this.sheetsApi.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
    } catch (error) {
      this.logger.warn(`Error formatting headers for ${sheetName}:`, error);
    }
  }

  /**
   * Check if spreadsheet exists
   */
  async spreadsheetExists(spreadsheetId: string): Promise<boolean> {
    try {
      await this.sheetsApi.spreadsheets.get({ spreadsheetId });
      return true;
    } catch (error) {
      return false;
    }
  }

}

