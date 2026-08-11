import { IMPORT_TEMPLATE_BY_KIND } from "@amni/shared";
import type { ImportCellValue, ImportKind, ImportMapping, ImportSummary } from "@amni/shared";

import type { ErpClient } from "./client.js";
import { ErpError } from "./errors.js";

/**
 * M4-005: turns an import job's mapped rows into ERPNext documents and writes
 * them through the tenant's provisioned site. This is the only place that maps
 * an import kind to a Frappe doctype.
 *
 * The worker processor resolves the tenant client (createErpClientForTenant)
 * and delegates to runImportToErp so tenant isolation is enforced by the exact
 * same resolution path as every other ERP read/write.
 */

/** Import kind -> Frappe doctype. */
export const IMPORT_DOCTYPE_BY_KIND: Record<ImportKind, string> = {
  customers: "Customer",
  items: "Item",
  suppliers: "Supplier",
  contacts: "Contact",
  leads: "Lead",
};

/**
 * Template target field -> real Frappe field name. Template columns use
 * business language (e.g. `email`, `job_title`); ERPNext uses its own field
 * names (`email_id`, `designation`). Fields absent here pass through as-is.
 */
export const IMPORT_FIELD_BY_KIND: Record<ImportKind, Record<string, string>> = {
  customers: {
    customer_name: "customer_name",
    customer_type: "customer_type",
    customer_group: "customer_group",
    territory: "territory",
    email: "email_id",
    mobile_no: "mobile_no",
  },
  items: {
    item_code: "item_code",
    item_name: "item_name",
    item_group: "item_group",
    stock_uom: "stock_uom",
    standard_rate: "standard_rate",
  },
  suppliers: {
    supplier_name: "supplier_name",
    supplier_group: "supplier_group",
    supplier_type: "supplier_type",
    email: "email_id",
    mobile_no: "mobile_no",
  },
  contacts: {
    first_name: "first_name",
    last_name: "last_name",
    email: "email_id",
    mobile_no: "mobile_no",
    company: "company_name",
    department: "department",
    job_title: "designation",
  },
  leads: {
    company_name: "company_name",
    lead_name: "lead_name",
    lead_owner: "lead_owner",
    source: "source",
    status: "status",
    email: "email_id",
    phone: "phone",
  },
};

export function doctypeForImportKind(kind: ImportKind): string {
  return IMPORT_DOCTYPE_BY_KIND[kind];
}

function isEmptyCell(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

/**
 * Maps a validated row (target-field -> value) into the body for the kind's
 * doctype. Empty cells are dropped, and numeric template fields are coerced so
 * ERPNext receives numbers, not "12.50" strings.
 */
export function buildImportDoc(kind: ImportKind, record: Record<string, ImportCellValue>): Record<string, unknown> {
  const fieldMap = IMPORT_FIELD_BY_KIND[kind];
  const template = IMPORT_TEMPLATE_BY_KIND[kind];
  const doc: Record<string, unknown> = {};

  for (const [field, value] of Object.entries(record)) {
    if (isEmptyCell(value)) continue;
    const target = fieldMap[field] ?? field;
    const column = template.columns.find((c) => c.field === field);
    doc[target] = column?.type === "number" ? Number(value) : value;
  }

  return doc;
}

export interface ImportRowInput {
  row: number;
  record: Record<string, ImportCellValue>;
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportRunResult {
  /** Counts for the rows actually attempted (validated rows). */
  summary: ImportSummary;
  /** Row-level failures reported by ERPNext. */
  errors: ImportRowError[];
}

async function findDocByKey(
  client: ErpClient,
  doctype: string,
  keyField: string,
  keyValue: unknown,
): Promise<{ name: string } | undefined> {
  const { items } = await client.list<{ name: string }>(doctype, {
    filters: { [keyField]: keyValue },
    fields: ["name", keyField],
    limitPageLength: 1,
  });
  return items[0];
}

/**
 * Writes the given rows to the tenant's ERPNext site according to the mapping:
 * - `create` — always creates a new doc.
 * - `update_by_key` — updates the doc matching `keyField`; missing docs fail.
 * - `upsert` — updates the matching doc or creates one when absent.
 *
 * Row-level failures are captured per row so the caller can persist them and
 * keep a meaningful created/updated/failed breakdown even when one row breaks
 * the site's validation.
 */
export async function runImportToErp(
  client: ErpClient,
  kind: ImportKind,
  rows: ImportRowInput[],
  mapping: ImportMapping,
): Promise<ImportRunResult> {
  const doctype = doctypeForImportKind(kind);
  const fieldMap = IMPORT_FIELD_BY_KIND[kind];
  const keyField = mapping.keyField ? (fieldMap[mapping.keyField] ?? mapping.keyField) : undefined;

  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: ImportRowError[] = [];

  for (const { row, record } of rows) {
    const doc = buildImportDoc(kind, record);
    const isKeyed = mapping.mode === "update_by_key" || mapping.mode === "upsert";

    try {
      if (isKeyed) {
        const keyValue = keyField ? doc[keyField] : undefined;
        if (!keyField || isEmptyCell(keyValue)) {
          failed += 1;
          errors.push({ row, message: `Missing key field "${mapping.keyField ?? "key"}"` });
          continue;
        }
        const existing = await findDocByKey(client, doctype, keyField, keyValue);
        if (existing) {
          await client.update(doctype, existing.name, doc);
          updated += 1;
          continue;
        }
        if (mapping.mode === "update_by_key") {
          failed += 1;
          errors.push({ row, message: `No ${doctype} found with ${keyField} = ${String(keyValue)}` });
          continue;
        }
      }

      await client.create(doctype, doc);
      created += 1;
    } catch (err) {
      failed += 1;
      errors.push({ row, message: err instanceof ErpError ? err.message : (err as Error)?.message ?? "ERPNext request failed" });
    }
  }

  return {
    summary: {
      totalRows: rows.length,
      created,
      updated,
      skipped: 0,
      failed,
      warnings: 0,
    },
    errors,
  };
}
