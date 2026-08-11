import type {
  ImportCellValue,
  ImportIssue,
  ImportKind,
  ImportMapping,
  ImportSummary,
  ImportTemplate,
} from "./schemas/import.js";

export const IMPORT_TEMPLATES: ImportTemplate[] = [
  {
    kind: "customers",
    label: "Customers",
    description: "Create customer records in your ERP.",
    columns: [
      { field: "customer_name", label: "Customer Name", required: true, type: "text" },
      { field: "customer_type", label: "Customer Type", required: false, type: "text" },
      { field: "customer_group", label: "Customer Group", required: false, type: "text" },
      { field: "territory", label: "Territory", required: false, type: "text" },
      { field: "email", label: "Email", required: false, type: "text" },
      { field: "mobile_no", label: "Mobile", required: false, type: "text" },
    ],
  },
  {
    kind: "items",
    label: "Products",
    description: "Create product (item) records in your ERP.",
    columns: [
      { field: "item_code", label: "Item Code", required: true, type: "text" },
      { field: "item_name", label: "Item Name", required: true, type: "text" },
      { field: "item_group", label: "Item Group", required: false, type: "text" },
      { field: "stock_uom", label: "Stock UOM", required: false, type: "text" },
      { field: "standard_rate", label: "Standard Rate", required: false, type: "number" },
    ],
  },
  {
    kind: "suppliers",
    label: "Suppliers",
    description: "Create supplier records in your ERP.",
    columns: [
      { field: "supplier_name", label: "Supplier Name", required: true, type: "text" },
      { field: "supplier_group", label: "Supplier Group", required: false, type: "text" },
      { field: "supplier_type", label: "Supplier Type", required: false, type: "text" },
      { field: "email", label: "Email", required: false, type: "text" },
      { field: "mobile_no", label: "Mobile", required: false, type: "text" },
    ],
  },
  {
    kind: "contacts",
    label: "Contacts",
    description: "Create contact records in your ERP.",
    columns: [
      { field: "first_name", label: "First Name", required: true, type: "text" },
      { field: "last_name", label: "Last Name", required: false, type: "text" },
      { field: "email", label: "Email", required: false, type: "text" },
      { field: "mobile_no", label: "Mobile", required: false, type: "text" },
      { field: "company", label: "Company", required: false, type: "text" },
      { field: "department", label: "Department", required: false, type: "text" },
      { field: "job_title", label: "Job Title", required: false, type: "text" },
    ],
  },
  {
    kind: "leads",
    label: "Leads",
    description: "Create lead records in your ERP.",
    columns: [
      { field: "company_name", label: "Company Name", required: true, type: "text" },
      { field: "lead_name", label: "Lead Name", required: false, type: "text" },
      { field: "lead_owner", label: "Lead Owner", required: false, type: "text" },
      { field: "source", label: "Source", required: false, type: "text" },
      { field: "status", label: "Status", required: false, type: "text" },
      { field: "email", label: "Email", required: false, type: "text" },
      { field: "phone", label: "Phone", required: false, type: "text" },
    ],
  },
];

export const IMPORT_TEMPLATE_BY_KIND: Record<ImportKind, ImportTemplate> = Object.fromEntries(
  IMPORT_TEMPLATES.map((template) => [template.kind, template]),
) as Record<ImportKind, ImportTemplate>;

export function isImportTemplate(kind: unknown): kind is ImportKind {
  return typeof kind === "string" && kind in IMPORT_TEMPLATE_BY_KIND;
}

export function buildTemplateCsv(kind: ImportKind): string {
  const template = IMPORT_TEMPLATE_BY_KIND[kind];
  const header = template.columns.map((column) => column.label).join(",");
  const example = template.columns.map((column) => (column.required ? "Example value" : "")).join(",");
  return `${header}\n${example}\n`;
}

export interface ImportRowResult {
  row: number;
  record: Record<string, ImportCellValue>;
  issues: ImportIssue[];
}

export function applyImportMapping(
  row: Record<string, ImportCellValue>,
  mapping: ImportMapping,
): ImportRowResult {
  const record: Record<string, ImportCellValue> = {};
  const issues: ImportIssue[] = [];

  for (const column of mapping.columns) {
    if (!(column.sourceHeader in row)) {
      issues.push({
        severity: "error",
        column: column.targetField,
        message: `Column "${column.sourceHeader}" was not found in the file`,
      });
      continue;
    }
    record[column.targetField] = row[column.sourceHeader] ?? null;
  }

  return { row: -1, record, issues };
}

function isEmptyCell(value: ImportCellValue | undefined): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

export function validateImportRows(
  rows: Array<Record<string, ImportCellValue>>,
  mapping: ImportMapping,
  kind: ImportKind,
): { summary: ImportSummary; issues: ImportIssue[] } {
  const template = IMPORT_TEMPLATE_BY_KIND[kind];
  const templateFields = new Set(template.columns.map((column) => column.field));
  const requiredFields = template.columns.filter((column) => column.required).map((column) => column.field);
  const allIssues: ImportIssue[] = [];

  for (const column of mapping.columns) {
    if (!templateFields.has(column.targetField)) {
      allIssues.push({
        severity: "error",
        column: column.targetField,
        message: `"${column.targetField}" is not a valid target field for ${kind}`,
      });
    }
  }

  let created = 0;
  let failed = 0;
  let warnings = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const { record, issues } = applyImportMapping(row, mapping);
    const rowIssues: ImportIssue[] = [...issues];

    for (const field of requiredFields) {
      if (isEmptyCell(record[field])) {
        rowIssues.push({
          row: rowNumber,
          column: field,
          severity: "error",
          message: `Missing required field "${field}"`,
        });
      }
    }

    for (const column of mapping.columns) {
      const type = column.type ?? template.columns.find((c) => c.field === column.targetField)?.type ?? "text";
      const value: ImportCellValue | undefined = record[column.targetField];
      if (type === "number" && value !== undefined && !isEmptyCell(value) && Number.isNaN(Number(value))) {
        rowIssues.push({
          row: rowNumber,
          column: column.targetField,
          severity: "error",
          message: `"${String(value)}" is not a valid number`,
        });
      }
    }

    if (rowIssues.length > 0) {
      failed += 1;
      allIssues.push(...rowIssues);
    } else {
      created += 1;
    }
  });

  const blockingFields = new Set(allIssues.filter((issue) => issue.severity === "error" && !issue.row).map((issue) => issue.column ?? ""));
  warnings = allIssues.filter((issue) => issue.severity === "warning").length;

  return {
    summary: {
      totalRows: rows.length,
      created,
      updated: 0,
      skipped: 0,
      failed,
      warnings: warnings + blockingFields.size,
    },
    issues: allIssues,
  };
}
