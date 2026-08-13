export interface ImportContext {
  jobId: string;
  tenantId: string;
  kind: string;
  mode: "create" | "update_by_key" | "upsert";
  keyField?: string;
}

export interface ImportRowResult {
  status: "created" | "updated" | "skipped" | "failed";
  message?: string;
}

/**
 * Applies one already-mapped domain record (target field -> value) to the
 * target system. The engine owns the row loop, aggregation and persistence;
 * drivers own how a single record is written (ERP via packages/erp in M5).
 */
export interface ImportDriver {
  readonly name: string;
  apply(record: Record<string, string>, context: ImportContext): Promise<ImportRowResult>;
}
