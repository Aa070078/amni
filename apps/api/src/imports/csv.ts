import type { ColumnMapping, ImportTemplate, ImportTemplateColumn } from "@amni/shared";

/** Row as a map from source header -> trimmed cell value. */
export interface CsvRecord {
  [header: string]: string;
}

/**
 * RFC-4180-ish CSV parser. Handles quoted fields with embedded commas,
 * quotes (`""`), newlines, and both CRLF and LF line endings.
 */
export function parseCsv(content: string): string[][] {
  const text = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function csvToRecords(headers: string[], rows: string[][]): CsvRecord[] {
  return rows.map((cells) => {
    const record: CsvRecord = {};
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? "").trim();
    });
    return record;
  });
}

export function buildCsv(headers: string[], rows: Array<Array<string | number>>): string {
  const escape = (value: string | number): string => {
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [headers.map(escape).join(","), ...rows.map((cells) => cells.map(escape).join(","))];
  return lines.join("\n");
}

const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Best-effort auto-match of file headers to template columns: exact match on
 * field name or business label first, then substring fallback. Unmatched
 * headers map to an empty `targetField` (i.e. "don't import this column").
 */
export function suggestMapping(headers: string[], template: ImportTemplate): ColumnMapping[] {
  const byField = new Map<string, ImportTemplateColumn>();
  const byLabel = new Map<string, ImportTemplateColumn>();
  for (const column of template.columns) {
    byField.set(normalize(column.field), column);
    byLabel.set(normalize(column.label), column);
  }

  const used = new Set<string>();
  return headers.map((header) => {
    const norm = normalize(header);
    const exact = byField.get(norm) ?? byLabel.get(norm);
    let column = exact;
    if (!column) {
      for (const [key, candidate] of byField) {
        if (!used.has(candidate.field) && (key.includes(norm) || norm.includes(key))) {
          column = candidate;
          break;
        }
      }
    }
    if (!column || used.has(column.field)) {
      return { sourceHeader: header, targetField: "", required: false };
    }
    used.add(column.field);
    return { sourceHeader: header, targetField: column.field, required: column.required, type: column.type };
  });
}
