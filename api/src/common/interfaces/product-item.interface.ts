export interface CsvRow {
  qrFormatSku: string;
  specialFactor: string;
  productName: string;
}

export interface FailedRow {
  index: number;
  reason: string;
  row: CsvRow;
}

export interface ImportResult {
  successCount: number;
  failCount: number;
  failedRows: FailedRow[];
}
