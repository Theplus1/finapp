declare module 'xlsx-populate' {
  interface Cell {
    value(value?: any): any;
    style(name: string, value: any): Cell;
  }

  interface Column {
    width(width: number): Column;
  }

  interface Sheet {
    name(name?: string): string | Sheet;
    cell(row: number, col: number): Cell;
    cell(address: string): Cell;
    column(columnNameOrNumber: string | number): Column;
  }

  interface Workbook {
    sheet(sheetNameOrIndex: string | number): Sheet;
    addSheet(name: string): Sheet;
    outputAsync(): Promise<Uint8Array>;
  }

  function fromBlankAsync(): Promise<Workbook>;

  export = {
    fromBlankAsync,
  };
}
