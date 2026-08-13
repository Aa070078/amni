import type { ColumnMapping, ImportIssue, ImportMapping, ImportTemplate, ImportValidation } from "@amni/shared";
import type { CsvRecord } from "./csv";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NUMBER_RE = /^[+-]?(\d+(\.\d+)?|\.\d+)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const BOOLEAN_RE = /^(true|false|yes|no|1|0)$/i;

function checkType(type: string | undefined, value: string): boolean {
  switch (type) {
    case "email":
      return EMAIL_RE.test(value);
    case "number":
      return NUMBER_RE.test(value);
    case "currency":
      return NUMBER_RE.test(value.replace(/[^0-9.,+-]/g, "").replace(/,/g, ""));
    case "date": {
      if (!DATE_RE.test(value)) return false;
      const [year, month, day] = value.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      );
    }
    case "boolean":
      return BOOLEAN_RE.test(value);
    default:
      return true;
  }
}

const MAX_STORED_ISSUES = 200;

/**
 * Pure row-by-row validation of a parsed file against the chosen mapping and
 * template. Returns per-row issues (required-field + type checks) plus
 * duplicate-key warnings and aggregate stats.
 */
export function validateRecords(
  records: CsvRecord[],
  mapping: ImportMapping,
  template: ImportTemplate,
): ImportValidation {
  const issues: ImportIssue[] = [];
  const templateColumns = new Map(template.columns.map((column) => [column.field, column]));
  const mapped = mapping.columns.filter((column) => column.targetField !== "");
  const keyColumn: ColumnMapping | undefined =
    mapping.mode !== "create" && mapping.keyField
      ? mapping.columns.find((column) => column.targetField === mapping.keyField)
      : undefined;
  const seenKeys = new Map<string, number[]>();

  records.forEach((record, index) => {
    const rowNumber = index + 1;
    const rowIssues: ImportIssue[] = [];

    for (const column of mapped) {
      const value = record[column.sourceHeader] ?? "";
      const target = templateColumns.get(column.targetField);

      if (column.required || target?.required) {
        if (value === "") {
          rowIssues.push({
            row: rowNumber,
            column: column.sourceHeader,
            severity: "error",
            message: `"${column.sourceHeader}" is required`,
          });
        }
      }

      if (value !== "" && target) {
        const type = column.type ?? target.type;
        if (!checkType(type, value)) {
          rowIssues.push({
            row: rowNumber,
            column: column.sourceHeader,
            severity: "error",
            message: `"${value}" is not a valid ${type === "currency" ? "amount" : type}`,
          });
        }
      }

      if (keyColumn && column.targetField === keyColumn.targetField && value !== "") {
        const seen = seenKeys.get(value) ?? [];
        if (seen.length > 0) {
          rowIssues.push({
            row: rowNumber,
            column: column.sourceHeader,
            severity: "warning",
            message: `Duplicate key "${value}"`,
          });
        }
        seen.push(rowNumber);
        seenKeys.set(value, seen);
      }
    }

    issues.push(...rowIssues);
  });

  return {
    issues: issues.slice(0, MAX_STORED_ISSUES),
    stats: {
      totalRows: records.length,
      errors: issues.filter((issue) => issue.severity === "error").length,
      warnings: issues.filter((issue) => issue.severity === "warning").length,
    },
  };
}
