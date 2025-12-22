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
 */
@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private sheetsApi: sheets_v4.Sheets;
  private jwtClient: JWT;
  private readonly chunkSize: number;

  constructor(private readonly configService: ConfigService) {
    this.chunkSize = this.configService.get<number>('googleSheets.chunkSize', 5000);
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
   * Update data to spreadsheet
   */
  async updateSheets(spreadsheetId: string, sheets: SheetData[]): Promise<void> {
    try {
      // Get existing sheets info
      const spreadsheet = await this.sheetsApi.spreadsheets.get({ spreadsheetId });
      const existingSheets = spreadsheet.data.sheets || [];
      const existingSheetMap = new Map<string, number>(
        existingSheets.map((s) => [s.properties?.title || '', s.properties?.sheetId || 0]),
      );

      const requests: any[] = [];
      const sheetIdMap = new Map<string, number>();

      for (let i = 0; i < sheets.length; i++) {
        const sheetName = sheets[i].name;
        const existingSheetId = existingSheetMap.get(sheetName);

        if (existingSheetId !== undefined) {
          sheetIdMap.set(sheetName, existingSheetId);

          if (i === 0 && existingSheets[0]?.properties?.title !== sheetName) {
            requests.push({
              updateSheetProperties: {
                properties: {
                  sheetId: existingSheetId,
                  title: sheetName,
                },
                fields: 'title',
              },
            });
          }
        } else {
          // Sheet doesn't exist, create it
          requests.push({
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          });
        }
      }

      // Execute batch update to create/rename sheets if needed
      if (requests.length > 0) {
        await this.sheetsApi.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests },
        });

        const refreshedSpreadsheet = await this.sheetsApi.spreadsheets.get({ spreadsheetId });
        const refreshedSheets = refreshedSpreadsheet.data.sheets || [];
        for (const sheet of refreshedSheets) {
          const title = sheet.properties?.title || '';
          if (sheets.some((s) => s.name === title)) {
            sheetIdMap.set(title, sheet.properties?.sheetId || 0);
          }
        }
      } else {
        for (const sheet of existingSheets) {
          const title = sheet.properties?.title || '';
          if (sheets.some((s) => s.name === title) && !sheetIdMap.has(title)) {
            sheetIdMap.set(title, sheet.properties?.sheetId || 0);
          }
        }
      }

      const errors: Array<{ sheetName: string; error: any }> = [];
      
      for (const sheet of sheets) {
        const sheetId = sheetIdMap.get(sheet.name);
        if (sheetId === undefined) {
          const errorMsg = `Sheet "${sheet.name}" not found in spreadsheet ${spreadsheetId}`;
          this.logger.error(errorMsg);
          errors.push({ sheetName: sheet.name, error: new Error(errorMsg) });
          continue;
        }

        try {
          // Payment sheet
          if (sheet.name === 'Payment') {
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
            await this.formatHeaders(spreadsheetId, sheet.name, sheetId);
            
            this.logger.debug(`Successfully updated sheet "${sheet.name}" in spreadsheet ${spreadsheetId}`);
          } 
          // Transactions History and Reversed
          else if (sheet.name === 'Transactions History' || sheet.name === 'Reversed') {
            const range = `${sheet.name}!A1`;

            // Clear sheet
            await this.sheetsApi.spreadsheets.values.clear({
              spreadsheetId,
              range: `${sheet.name}!A2:Z`,
            });

            // Write headers first
            await this.sheetsApi.spreadsheets.values.update({
              spreadsheetId,
              range: `${sheet.name}!A1`,
              valueInputOption: 'RAW',
              requestBody: { values: [sheet.headers] },
            });

            // Format headers
            await this.formatHeaders(spreadsheetId, sheet.name, sheetId);

            // Write data in chunks
            const totalRows = sheet.rows.length;
            
            if (totalRows > 0) {
              for (let i = 0; i < totalRows; i += this.chunkSize) {
                const chunk = sheet.rows.slice(i, i + this.chunkSize);
                const startRow = i + 2;
                const endRow = startRow + chunk.length - 1;
                const chunkRange = `${sheet.name}!A${startRow}:Z${endRow}`;

                await this.sheetsApi.spreadsheets.values.update({
                  spreadsheetId,
                  range: chunkRange,
                  valueInputOption: 'RAW',
                  requestBody: { values: chunk },
                });

                this.logger.debug(
                  `Wrote chunk ${Math.floor(i / this.chunkSize) + 1}/${Math.ceil(totalRows / this.chunkSize)} ` +
                  `(rows ${startRow}-${endRow}) for sheet "${sheet.name}"`,
                );
              }

              // Clear format for all data rows
              const startRowIndex = 1;
              const endRowIndex = 1 + totalRows;
              await this.clearDataRowFormat(spreadsheetId, sheetId, startRowIndex, endRowIndex);
            }
            
            this.logger.debug(
              `Updated sheet "${sheet.name}" with ${totalRows} rows (clean + write, ${Math.ceil(totalRows / this.chunkSize)} chunks) in spreadsheet ${spreadsheetId}`,
            );
          } 
          // Other sheets
          else {
            const range = `${sheet.name}!A1`;

            // Clear sheet
            await this.sheetsApi.spreadsheets.values.clear({
              spreadsheetId,
              range: `${sheet.name}!A:Z`,
            });

            const values = [sheet.headers, ...sheet.rows];

            await this.sheetsApi.spreadsheets.values.update({
              spreadsheetId,
              range,
              valueInputOption: 'RAW',
              requestBody: { values },
            });

            // Format headers
            await this.formatHeaders(spreadsheetId, sheet.name, sheetId);
            
            this.logger.debug(`Successfully updated sheet "${sheet.name}" in spreadsheet ${spreadsheetId}`);
          }
        } catch (error) {
          this.logger.error(
            `Failed to update sheet "${sheet.name}" in spreadsheet ${spreadsheetId}:`,
            error,
          );
          errors.push({ sheetName: sheet.name, error });
        }
      }

      if (errors.length > 0) {
        const errorMessages = errors.map((e) => `Sheet "${e.sheetName}": ${e.error.message}`).join('; ');
        throw new Error(`Failed to update ${errors.length} sheet(s) in spreadsheet ${spreadsheetId}: ${errorMessages}`);
      }

      this.logger.log(`Updated spreadsheet: ${spreadsheetId} with ${sheets.length} sheets`);
    } catch (error) {
      this.logger.error(`Error updating spreadsheet: ${spreadsheetId}`, error);
      throw error;
    }
  }

  /**
   * Clear format for data rows
   * @param spreadsheetId - The spreadsheet ID
   * @param sheetId - The sheet ID
   * @param startRowIndex - Start row index
   * @param endRowIndex - End row index
   */
  private async clearDataRowFormat(
    spreadsheetId: string,
    sheetId: number,
    startRowIndex: number,
    endRowIndex: number,
  ): Promise<void> {
    try {
      if (startRowIndex < 1) {
        startRowIndex = 1;
      }

      const requests = [
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex,
              endRowIndex,
              startColumnIndex: 0,
              endColumnIndex: 26,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 1.0,
                  green: 1.0,
                  blue: 1.0,
                },
                textFormat: {
                  bold: false,
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
      this.logger.warn(`Error clearing data row format:`, error);
    }
  }

  /**
   * Format headers
   * @param spreadsheetId - The spreadsheet ID
   * @param sheetName - The sheet name
   * @param sheetId - The sheet ID
   */
  private async formatHeaders(
    spreadsheetId: string,
    sheetName: string,
    sheetId?: number,
  ): Promise<void> {
    try {
      let targetSheetId = sheetId;

      if (targetSheetId === undefined) {
        const spreadsheet = await this.sheetsApi.spreadsheets.get({ spreadsheetId });
        const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === sheetName);

        if (!sheet || !sheet.properties?.sheetId) {
          return;
        }

        targetSheetId = sheet.properties.sheetId;
      }

      const requests = [
        {
          repeatCell: {
            range: {
              sheetId: targetSheetId,
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

