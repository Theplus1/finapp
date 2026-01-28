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
            
            // Apply currency formatting to columns B, C, D, E (Tổng nạp, Tổng tiêu, Tổng refund, Account Balance)
            await this.applyCurrencyFormat(spreadsheetId, sheetId, [1, 2, 3, 4], sheet.rows.length);
            
            this.logger.debug(`Successfully updated sheet "${sheet.name}" in spreadsheet ${spreadsheetId}`);
          }
          // Deposit sheet - update Date column only, preserve Tổng nạp column (B)
          else if (sheet.name === SheetName.DEPOSIT) {
            const existingRange = `${sheet.name}!A2:B`;
            let existingData: any[][] = [];
            
            try {
              const existingResponse = await this.sheetsApi.spreadsheets.values.get({
                spreadsheetId,
                range: existingRange,
              });
              existingData = existingResponse.data.values || [];
            } catch (error) {
              this.logger.debug(`No existing data found in ${sheet.name}, will create new`);
            }

            const existingDepositMap = new Map<string, string>();
            existingData.forEach((row) => {
              if (row && row.length >= 2 && row[0] && row[1]) {
                existingDepositMap.set(row[0], row[1]);
              }
            });

            const newValues: any[][] = [sheet.headers];
            
            sheet.rows.forEach((row) => {
              const date = row[0];
              const existingDeposit = existingDepositMap.get(date) || '';
              newValues.push([date, existingDeposit]);
            });

            const dateValues: any[][] = newValues.map((row, index) => [row[0]]);
            
            await this.sheetsApi.spreadsheets.values.update({
              spreadsheetId,
              range: `${sheet.name}!A1:B1`,
              valueInputOption: 'RAW',
              requestBody: { values: [sheet.headers] },
            });

            if (dateValues.length > 1) {
              await this.sheetsApi.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheet.name}!A2:A${dateValues.length}`,
                valueInputOption: 'RAW',
                requestBody: { values: dateValues.slice(1) },
              });
            }

            // Format headers (bold)
            await this.formatHeaders(spreadsheetId, sheet.name, sheetId);
            
            const totalRows = Math.max(sheet.rows.length + 100, 1000);
            await this.applyCurrencyFormatForDeposit(spreadsheetId, sheetId, [1], totalRows);
            
            this.logger.debug(`Successfully updated sheet "${sheet.name}" in spreadsheet ${spreadsheetId}`);
          } 
          // Transactions History, Reversed, Location, and Hold sheets
          else if (sheet.name === SheetName.TRANSACTIONS_HISTORY || sheet.name === SheetName.REVERSED || sheet.name === SheetName.LOCATION || sheet.name === SheetName.HOLD) {
            const range = `${sheet.name}!A1`;

            // Get current sheet properties to check row count
            const spreadsheet = await this.sheetsApi.spreadsheets.get({ spreadsheetId });
            const currentSheet = spreadsheet.data.sheets?.find((s) => s.properties?.sheetId === sheetId);
            const currentRowCount = currentSheet?.properties?.gridProperties?.rowCount || 1000;

            // Calculate required rows
            const requiredRows = 1 + sheet.rows.length;
            
            if (requiredRows > currentRowCount) {
              this.logger.log(
                `Expanding sheet "${sheet.name}" from ${currentRowCount} to ${requiredRows} rows`,
              );
              
              await this.sheetsApi.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                  requests: [
                    {
                      updateSheetProperties: {
                        properties: {
                          sheetId: sheetId,
                          gridProperties: {
                            rowCount: requiredRows,
                          },
                        },
                        fields: 'gridProperties.rowCount',
                      },
                    },
                  ],
                },
              });
              
              this.logger.debug(
                `Successfully expanded sheet "${sheet.name}" to ${requiredRows} rows`,
              );
            }

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

            // Write data in batches and chunks
            const BATCH_SIZE = 5000; 
            const totalRows = sheet.rows.length;
            
            if (totalRows > 0) {
              let batchNumber = 1;
              let totalWritten = 0;
              
              for (let batchStart = 0; batchStart < totalRows; batchStart += BATCH_SIZE) {
                const batchEnd = Math.min(batchStart + BATCH_SIZE, totalRows);
                const batchRows = sheet.rows.slice(batchStart, batchEnd);
                const batchSize = batchRows.length;
                
                this.logger.debug(
                  `Processing batch ${batchNumber} for sheet "${sheet.name}": ` +
                  `rows ${batchStart + 1}-${batchEnd} (${batchSize} rows)`,
                );
                
                for (let i = 0; i < batchSize; i += this.chunkSize) {
                  const chunk = batchRows.slice(i, i + this.chunkSize);
                  const startRow = batchStart + i + 2;
                  const endRow = startRow + chunk.length - 1;
                  
                  const chunkRange = `${sheet.name}!A${startRow}:Z${endRow}`;
                  
                  await this.sheetsApi.spreadsheets.values.update({
                    spreadsheetId,
                    range: chunkRange,
                    valueInputOption: 'RAW',
                    requestBody: { values: chunk },
                  });
                  
                  totalWritten += chunk.length;
                  this.logger.debug(
                    `  Wrote chunk ${Math.floor(i / this.chunkSize) + 1}/${Math.ceil(batchSize / this.chunkSize)} ` +
                    `(rows ${startRow}-${endRow}, ${chunk.length} rows)`,
                  );
                }
                
                batchNumber++;
              }

              // Clear format for all data rows
              const startRowIndex = 1;
              const endRowIndex = 1 + totalWritten;
              await this.clearDataRowFormat(spreadsheetId, sheetId, startRowIndex, endRowIndex);
              
              this.logger.log(
                `Successfully wrote ${totalWritten} rows to sheet "${sheet.name}" ` +
                `in ${batchNumber - 1} batch(es)`,
              );
            }
            
            // Apply currency formatting based on sheet type (format every update)
            if (totalRows > 0) {
              if (sheet.name === SheetName.TRANSACTIONS_HISTORY || sheet.name === SheetName.HOLD || sheet.name === SheetName.REVERSED) {
                // Amount column is at index 4 (column E)
                await this.applyCurrencyFormat(spreadsheetId, sheetId, [4], totalRows);
              } else if (sheet.name === SheetName.LOCATION) {
                // Amount columns are at index 1 and 2 (columns B and C)
                await this.applyCurrencyFormat(spreadsheetId, sheetId, [1, 2], totalRows);
              }
            }
            
            this.logger.debug(
              `Updated sheet "${sheet.name}" with ${totalRows} rows ` +
              `(${Math.ceil(totalRows / BATCH_SIZE)} batches, ${Math.ceil(totalRows / this.chunkSize)} chunks) ` +
              `in spreadsheet ${spreadsheetId}`,
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
            
            // Apply currency formatting for Refunded sheet (Amount column at index 4)
            if (sheet.name === SheetName.REFUNDED && sheet.rows.length > 0) {
              await this.applyCurrencyFormat(spreadsheetId, sheetId, [4], sheet.rows.length);
            }
            
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
            startRowIndex: 1,
            endRowIndex: rowCount + 2,
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
   * Apply currency formatting to specific columns for Deposit sheet
   * @param spreadsheetId - Google Spreadsheet ID
   * @param sheetId - Sheet ID within the spreadsheet
   * @param columns - Array of column indices (0-based) to format
   * @param rowCount - Number of data rows (excluding header)
   */
  private async applyCurrencyFormatForDeposit(
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
            startRowIndex: 1,
            endRowIndex: rowCount + 1,
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

      this.logger.debug(`Applied currency formatting to columns ${columns.join(', ')} for Deposit sheet`);
    } catch (error) {
      this.logger.warn('Error applying currency format for Deposit sheet:', error);
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

  /**
   * Append rows to a sheet
   */
  async appendRows(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error(
        'Google Sheets is not initialized. Please configure GOOGLE_SERVICE_ACCOUNT_KEY environment variable.',
      );
    }
    try {
      await this.sheetsApi.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values },
      });
    } catch (error) {
      this.logger.error(`Error appending rows to ${range}:`, error);
      throw error;
    }
  }

  /**
   * Batch update multiple ranges in a sheet
   */
  async batchUpdate(spreadsheetId: string, updates: Array<{ range: string; values: any[][] }>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error(
        'Google Sheets is not initialized. Please configure GOOGLE_SERVICE_ACCOUNT_KEY environment variable.',
      );
    }
    try {
      const data = updates.map((update) => ({
        range: update.range,
        values: update.values,
      }));

      await this.sheetsApi.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data,
        },
      });
    } catch (error) {
      this.logger.error(`Error batch updating spreadsheet ${spreadsheetId}:`, error);
      throw error;
    }
  }

  /**
   * Clear rows in a sheet (keep header)
   */
  async clearSheetRows(spreadsheetId: string, sheetName: string, startRow: number = 2): Promise<void> {
    if (!this.isInitialized) {
      throw new Error(
        'Google Sheets is not initialized. Please configure GOOGLE_SERVICE_ACCOUNT_KEY environment variable.',
      );
    }
    try {
      await this.sheetsApi.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A${startRow}:Z`,
      });
    } catch (error) {
      this.logger.error(`Error clearing rows in ${sheetName}:`, error);
      throw error;
    }
  }

  /**
   * Update sheet values
   */
  async updateSheetValues(
    spreadsheetId: string,
    range: string,
    values: any[][],
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error(
        'Google Sheets is not initialized. Please configure GOOGLE_SERVICE_ACCOUNT_KEY environment variable.',
      );
    }
    try {
      await this.sheetsApi.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values },
      });
    } catch (error) {
      this.logger.error(`Error updating sheet values at ${range}:`, error);
      throw error;
    }
  }

  /**
   * Insert rows at a specific position
   */
  async insertRows(
    spreadsheetId: string,
    sheetName: string,
    startRow: number,
    values: any[][],
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error(
        'Google Sheets is not initialized. Please configure GOOGLE_SERVICE_ACCOUNT_KEY environment variable.',
      );
    }
    try {
      const spreadsheet = await this.sheetsApi.spreadsheets.get({ spreadsheetId });
      const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === sheetName);
      if (!sheet || !sheet.properties?.sheetId) {
        throw new Error(`Sheet ${sheetName} not found`);
      }

      await this.sheetsApi.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              insertDimension: {
                range: {
                  sheetId: sheet.properties.sheetId,
                  dimension: 'ROWS',
                  startIndex: startRow - 1,
                  endIndex: startRow - 1 + values.length,
                },
              },
            },
          ],
        },
      });

      const range = `${sheetName}!A${startRow}`;
      await this.sheetsApi.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values },
      });
    } catch (error) {
      this.logger.error(`Error inserting rows in ${sheetName} at row ${startRow}:`, error);
      throw error;
    }
  }

  /**
   * Sort sheet by date column
   */
  async sortSheetByDateAsc(
    spreadsheetId: string,
    sheetName: string,
    dateColumnIndex: number = 1,
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error(
        'Google Sheets is not initialized. Please configure GOOGLE_SERVICE_ACCOUNT_KEY environment variable.',
      );
    }
    try {
      const spreadsheet = await this.sheetsApi.spreadsheets.get({ spreadsheetId });
      const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === sheetName);
      if (!sheet || !sheet.properties?.sheetId) {
        throw new Error(`Sheet ${sheetName} not found`);
      }

      const sheetId = sheet.properties.sheetId;
      const lastRow = sheet.properties.gridProperties?.rowCount || 1000;

      await this.sheetsApi.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              sortRange: {
                range: {
                  sheetId,
                  startRowIndex: 1,
                  endRowIndex: lastRow,
                  startColumnIndex: 0,
                  endColumnIndex: 26,
                },
                sortSpecs: [
                  {
                    dimensionIndex: dateColumnIndex,
                    sortOrder: 'ASCENDING',
                  },
                ],
              },
            },
          ],
        },
      });

      this.logger.debug(`Sorted ${sheetName} by date column`);
    } catch (error) {
      this.logger.error(`Error sorting sheet ${sheetName} by date:`, error);
      throw error;
    }
  }

  /**
   * Apply conditional formatting to Card sheet to highlight cells with amount > 1000
   * Note: Values in Card sheet are negative (e.g., -5000 means amount is 5000)
   * So we highlight cells with value < -1000 (more negative = larger amount)
   * @param spreadsheetId - The spreadsheet ID
   * @param sheetName - The sheet name (default: 'Card')
   */
  async applyCardSheetConditionalFormatting(
    spreadsheetId: string,
    sheetName: string = 'Card',
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error(
        'Google Sheets is not initialized. Please configure GOOGLE_SERVICE_ACCOUNT_KEY environment variable.',
      );
    }

    try {
      // Get sheet ID
      const spreadsheet = await this.sheetsApi.spreadsheets.get({ spreadsheetId });
      const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === sheetName);

      if (!sheet || !sheet.properties?.sheetId) {
        this.logger.warn(`Sheet "${sheetName}" not found in spreadsheet ${spreadsheetId}`);
        return;
      }

      const sheetId = sheet.properties.sheetId;
      const gridProperties = sheet.properties.gridProperties;
      
      if (!gridProperties) {
        this.logger.warn(`Sheet "${sheetName}" has no grid properties`);
        return;
      }

      const rowCount = gridProperties.rowCount || 1000;
      const columnCount = gridProperties.columnCount || 25;

      // First, get existing conditional format rules for this sheet
      const spreadsheetWithRules = await this.sheetsApi.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets(properties(sheetId,title),conditionalFormats)',
      });

      const existingSheet = spreadsheetWithRules.data.sheets?.find(
        (s) => s.properties?.sheetId === sheetId,
      );

      // Delete existing conditional format rules for this sheet (delete from highest index to lowest to avoid index shifting)
      if (existingSheet?.conditionalFormats && existingSheet.conditionalFormats.length > 0) {
        const ruleCount = existingSheet.conditionalFormats.length;
        this.logger.debug(
          `Found ${ruleCount} existing conditional format rule(s) for sheet "${sheetName}", deleting...`,
        );
        
        const deleteRequests: any[] = [];
        for (let i = ruleCount - 1; i >= 0; i--) {
          deleteRequests.push({
            deleteConditionalFormatRule: {
              sheetId,
              index: i,
            },
          });
        }

        if (deleteRequests.length > 0) {
          await this.sheetsApi.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: { requests: deleteRequests },
          });
          this.logger.debug(`Deleted ${deleteRequests.length} existing conditional format rule(s)`);
        }
      }

      // Add new conditional format rule: highlight cells with amount > 1000
      // Note: Values in Card sheet are negative (e.g., -5000 means amount is 5000)
      // So we use NUMBER_LESS with -1000 to highlight large amounts (more negative = larger amount)
      // Apply from row 3 onwards (row 2 is "Total" row, so skip it)
      // Apply to all data cells (B3:Z, excluding column A which contains card names)
      const addRequest = {
        addConditionalFormatRule: {
          rule: {
            ranges: [
              {
                sheetId,
                startRowIndex: 2, // Row 3 (0-based, so 2 = row 3), skip row 2 which is "Total"
                endRowIndex: rowCount,
                startColumnIndex: 1, // Column B (0-based, so 1 = column B)
                endColumnIndex: columnCount,
              },
            ],
            booleanRule: {
              condition: {
                type: 'NUMBER_LESS',
                values: [
                  {
                    userEnteredValue: '-1000',
                  },
                ],
              },
              format: {
                backgroundColor: {
                  red: 1.0, // Red
                  green: 0.8, // Light green
                  blue: 0.8, // Light blue (pink/light red color)
                },
                textFormat: {
                  bold: true,
                },
              },
            },
          },
          index: 0,
        },
      };

      await this.sheetsApi.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [addRequest] },
      });

      this.logger.log(
        `Applied conditional formatting to sheet "${sheetName}" (highlight cells < -1000, i.e., amount > 1000) ` +
        `for range B3:${String.fromCharCode(64 + columnCount)}${rowCount} (excluding row 2 "Total")`,
      );
    } catch (error) {
      this.logger.warn(`Error applying conditional formatting to sheet "${sheetName}":`, error);
      // Don't throw error, just log warning so it doesn't break the sync process
    }
  }

}

