import XlsxPopulate = require('xlsx-populate');

export type ExcelColumn<T> = {
  key: keyof T | string;
  header: string;
  map?: (row: T) => unknown;
};

export type ExcelSheet<T> = {
  name: string;
  data: T[];
  columns: Array<ExcelColumn<T>>;
  customBuilder?: (sheet: any, data: T[], columns: Array<ExcelColumn<T>>) => void | Promise<void>;
};

// Constants
const HEADER_ROW_INDEX = 1;
const DATA_START_ROW_INDEX = 2;
const DEFAULT_COLUMN_WIDTH = 15;

/**
 * Extract cell value from row using column definition
 */
function extractCellValue<T extends Record<string, any>>(
  row: T,
  column: ExcelColumn<T>,
): unknown {
  if (typeof column.map === 'function') {
    return column.map(row);
  }
  const key = column.key as keyof T;
  return row[key];
}

/**
 * Normalize cell value for Excel (convert null/undefined to empty string)
 */
function normalizeCellValue(value: unknown): string | number | boolean | Date {
  if (value === null || value === undefined) {
    return '';
  }
  return value as string | number | boolean | Date;
}

/**
 * Write headers to sheet with bold styling
 */
function writeHeaders<T>(
  sheet: any,
  columns: Array<ExcelColumn<T>>,
): void {
  columns.forEach((column, colIndex) => {
    const cell = sheet.cell(HEADER_ROW_INDEX, colIndex + 1);
    cell.value(column.header);
    cell.style('bold', true);
  });
}

/**
 * Write data rows to sheet
 */
function writeDataRows<T extends Record<string, any>>(
  sheet: any,
  data: T[],
  columns: Array<ExcelColumn<T>>,
): void {
  data.forEach((row, rowIndex) => {
    columns.forEach((column, colIndex) => {
      const value = extractCellValue(row, column);
      const cellValue = normalizeCellValue(value);
      sheet.cell(rowIndex + DATA_START_ROW_INDEX, colIndex + 1).value(cellValue);
    });
  });
}

/**
 * Set default column widths
 */
function setColumnWidths(
  sheet: any,
  columnCount: number,
  width: number = DEFAULT_COLUMN_WIDTH,
): void {
  for (let colIndex = 0; colIndex < columnCount; colIndex++) {
    const columnLetter = String.fromCharCode(65 + colIndex); // A, B, C, etc.
    sheet.column(columnLetter).width(width);
  }
}

/**
 * Generate Excel file buffer from objects with support for multiple sheets
 * @param sheets Array of sheets to include in the workbook
 * @returns Promise<Buffer> Excel file buffer
 */
export async function toExcelFromSheets<T extends Record<string, any>>(
  sheets: Array<ExcelSheet<T>>,
): Promise<Buffer> {
  const workbook = await XlsxPopulate.fromBlankAsync();

  for (let index = 0; index < sheets.length; index++) {
    const { name, data, columns, customBuilder } = sheets[index];

    // First sheet already exists, just rename it; others need to be added
    const sheet = index === 0 ? workbook.sheet(0) : workbook.addSheet(name);
    if (index === 0) {
      sheet.name(name);
    }

    // Use custom builder if provided, otherwise use default
    if (customBuilder) {
      await customBuilder(sheet, data, columns);
    } else {
      // Write content
      writeHeaders(sheet, columns);
      writeDataRows(sheet, data, columns);
      setColumnWidths(sheet, columns.length);
    }
  }

  const buffer = await workbook.outputAsync();
  return buffer as Buffer;
}

/**
 * Generate Excel file buffer from objects (single sheet)
 * @param items Array of objects to export
 * @param columns Column definitions
 * @param sheetName Optional sheet name (default: 'Sheet1')
 * @returns Promise<Buffer> Excel file buffer
 */
export async function toExcelFromObjects<T extends Record<string, any>>(
  items: T[],
  columns: Array<ExcelColumn<T>>,
  sheetName = 'Sheet1',
): Promise<Buffer> {
  return toExcelFromSheets([
    {
      name: sheetName,
      data: items,
      columns,
    },
  ]);
}
