import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";

import type { ImportCellValue, ImportFileMetadata } from "@amni/shared";

export interface UploadedImportFile {
  filename: string;
  size: number;
  buffer: Buffer;
}

export const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;

const CSV_EXT = /\.csv$/i;
const XLSX_EXT = /\.(xlsx|xls)$/i;
const DELIMITERS = [",", ";", "\t", "|"] as const;

export function isImportFileSupported(filename: string): boolean {
  return CSV_EXT.test(filename) || XLSX_EXT.test(filename);
}

function detectDelimiter(firstLine: string): string {
  let best = ",";
  let bestColumns = 0;
  for (const delimiter of DELIMITERS) {
    const columns = firstLine.split(delimiter).length;
    if (columns > bestColumns) {
      bestColumns = columns;
      best = delimiter;
    }
  }
  return best;
}

function parseCsv(buffer: Buffer): { headers: string[]; rows: Array<Record<string, ImportCellValue>> } {
  const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const delimiter = detectDelimiter(lines[0] ?? ",");
  const records = parse(text, {
    delimiter,
    bom: true,
    trim: true,
    skip_empty_lines: true,
    relax_column_count: true,
    columns: true,
  }) as Array<Record<string, string>>;

  const headers = Object.keys(records[0] ?? {}).map((header, index) => header.trim() || `column_${index + 1}`);
  const rows = records.map((record) => {
    const normalized: Record<string, ImportCellValue> = {};
    for (const header of headers) {
      normalized[header] = record[header] === "" ? null : (record[header] ?? null);
    }
    return normalized;
  });

  return { headers, rows };
}

function parseXlsx(buffer: Buffer): { headers: string[]; rows: Array<Record<string, ImportCellValue>> } {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const firstSheet = workbook.SheetNames[0];
  const sheet = firstSheet ? workbook.Sheets[firstSheet] : undefined;
  if (!sheet) {
    return { headers: [], rows: [] };
  }

  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  const headers = Object.keys(records[0] ?? {});
  const rows = records.map((record) => {
    const normalized: Record<string, ImportCellValue> = {};
    for (const header of headers) {
      const value = record[header];
      normalized[header] = typeof value === "number" || typeof value === "boolean" || value === null
        ? value
        : String(value);
    }
    return normalized;
  });

  return { headers, rows };
}

/**
 * Parses an uploaded CSV/XLSX into normalized row objects keyed by header,
 * with a bounded preview for the mapping/validation steps.
 */
export function parseImportFile(file: UploadedImportFile): ImportFileMetadata {
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    throw new Error("IMPORT_FILE_TOO_LARGE");
  }

  let headers: string[];
  let rows: Array<Record<string, ImportCellValue>>;

  if (CSV_EXT.test(file.filename)) {
    ({ headers, rows } = parseCsv(file.buffer));
  } else if (XLSX_EXT.test(file.filename)) {
    ({ headers, rows } = parseXlsx(file.buffer));
  } else {
    throw new Error("IMPORT_FILE_UNSUPPORTED");
  }

  if (headers.length === 0 || rows.length === 0) {
    throw new Error("IMPORT_FILE_EMPTY");
  }

  return {
    filename: file.filename,
    size: file.size,
    delimiter: ",",
    encoding: "utf-8",
    totalRows: rows.length,
    headers,
    preview: rows.slice(0, 50),
    rows,
  };
}
