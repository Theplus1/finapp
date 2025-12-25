import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, sheets_v4 } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { SheetName } from '../constants/sheet-names.constant';

export interface ColumnStyle {
  range?: string; // e.g., 'B2:B50' - if not provided, applies to entire column
  styles?: Record<string, any>; // e.g., { numberFormat: '$#,##0.00', bold: true, alignment: { horizontal: 'center' } }
}

export interface SheetData {
  name: string;
  headers: string[];
  rows: any[][];
  columnStyles?: Record<string, string | ColumnStyle>; // e.g., { 'B': '$#,##0.00' } or { 'B': { range: 'B2:B50', styles: { numberFormat: '$#,##0.00' } } }
}

/**
 * Google Sheets Service
 */
@Injectable()
export class GoogleSheetsService implements OnModuleInit {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private sheetsApi: sheets_v4.Sheets;
  private auth: GoogleAuth;
  private readonly chunkSize: number;
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {
    const chunkSizeStr = this.configService.get<string>('googleSheets.chunkSize', '5000');
    const parsedChunkSize = parseInt(chunkSizeStr, 10);
    this.chunkSize = isNaN(parsedChunkSize) || parsedChunkSize <= 0 ? 5000 : parsedChunkSize;
  }

  /**
   * Initialize authentication on module init
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.initializeAuth();
      this.isInitialized = true;
    } catch (error) {
      this.logger.error('Failed to initialize Google Sheets authentication:', error);
      throw error;
    }
  }

  /**
   * Initialize authentication with Google APIs using environment variables
   * Required config:
   * - googleSheets.accountKey (base64 encoded service account JSON)
   */
  private async initializeAuth(): Promise<void> {
    const accountKey = this.configService.get<string>('googleSheets.accountKey');
    if (!accountKey) {
      throw new Error(
        'Google Sheets authentication failed: Missing required configuration. ' +
        'Please set GOOGLE_SERVICE_ACCOUNT_KEY environment variable.',
      );
    }

    this.logger.log('Initializing Google Sheets authentication from base64 encoded credentials');
    const credentials = JSON.parse(Buffer.from(accountKey, 'base64').toString('utf8'));
    this.auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    this.sheetsApi = google.sheets({ version: 'v4', auth: this.auth });
    this.logger.log(`Authenticated with service account: ${credentials.client_email}`);
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
        // Skip Deposit sheet if it already exists (preserve manual data)
        if (sheet.name === SheetName.DEPOSIT && existingSheetMap.has(SheetName.DEPOSIT)) {
          this.logger.debug('Skipping Deposit sheet update - preserving manual data');
          continue;
        }

        const sheetId = sheetIdMap.get(sheet.name);
        if (sheetId === undefined) {
          const errorMsg = `Sheet "${sheet.name}" not found in spreadsheet ${spreadsheetId}`;
          this.logger.error(errorMsg);
          errors.push({ sheetName: sheet.name, error: new Error(errorMsg) });
          continue;
        }

        try {
          // Payment sheet - uses formulas, needs USER_ENTERED
          if (sheet.name === SheetName.PAYMENT) {
            const range = `${sheet.name}!A1`;

            // Clear sheet
            await this.sheetsApi.spreadsheets.values.clear({
              spreadsheetId,
              range: `${sheet.name}!A:Z`,
            });

            // Write headers and data with USER_ENTERED to interpret formulas
            const values = [sheet.headers, ...sheet.rows];

            await this.sheetsApi.spreadsheets.values.update({
              spreadsheetId,
              range,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values },
            });

            // Format headers (bold)
            await this.formatHeaders(spreadsheetId, sheet.name, sheetId);
            
            // Apply currency formatting to columns B, C, E (Tổng nạp, Tổng tiêu, Account Balance)
            await this.applyCurrencyFormat(spreadsheetId, sheetId, [1, 2, 4], sheet.rows.length);
            
            this.logger.debug(`Successfully updated sheet "${sheet.name}" in spreadsheet ${spreadsheetId}`);
          }
          // Deposit sheet - simple update with RAW values
          else if (sheet.name === SheetName.DEPOSIT) {
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
            
            // Apply currency formatting to column B (Tổng nạp)
            await this.applyCurrencyFormat(spreadsheetId, sheetId, [1], sheet.rows.length);
            
            this.logger.debug(`Successfully updated sheet "${sheet.name}" in spreadsheet ${spreadsheetId}`);
          } 
          // Transactions History, Reversed, Location, and Hold sheets - chunked update
          else if (sheet.name === SheetName.TRANSACTIONS_HISTORY || sheet.name === SheetName.REVERSED || sheet.name === SheetName.LOCATION || sheet.name === SheetName.HOLD) {
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
   * Apply currency formatting to specific columns
   * @param spreadsheetId - The spreadsheet ID
   * @param sheetId - The sheet ID
   * @param columns - Array of column indices to format (0-based)
   * @param rowCount - Number of rows to format
   */
  private async applyCurrencyFormat(
    spreadsheetId: string,
    sheetId: number,
    columns: number[],
    rowCount: number,
  ): Promise<void> {
    try {
      const requests = columns.map((columnIndex) => ({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 1, // Skip header row
            endRowIndex: rowCount + 2, // Include summary row and all data rows
            startColumnIndex: columnIndex,
            endColumnIndex: columnIndex + 1,
          },
          cell: {
            userEnteredFormat: {
              numberFormat: {
                type: 'CURRENCY',
                pattern: '$#,##0.00',
              },
            },
          },
          fields: 'userEnteredFormat.numberFormat',
        },
      }));

      await this.sheetsApi.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });

      this.logger.debug(`Applied currency formatting to columns ${columns.join(', ')}`);
    } catch (error) {
      this.logger.warn('Error applying currency format:', error);
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

  /**
   * Read data from a specific sheet
   */
  async readSheetData(spreadsheetId: string, sheetName: string, range?: string): Promise<any[][]> {
    try {
      const fullRange = range ? `${sheetName}!${range}` : `${sheetName}`;
      const response = await this.sheetsApi.spreadsheets.values.get({
        spreadsheetId,
        range: fullRange,
      });
      return response.data.values || [];
    } catch (error) {
      this.logger.warn(`Error reading sheet "${sheetName}" from spreadsheet ${spreadsheetId}:`, error);
      return [];
    }
  }

}

