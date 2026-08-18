import type { ErpClient } from "./client.js";

export const AMNI_CRM_RECORD_DOCTYPE = "Amni CRM Record";

export interface ErpCrmRecordDocument {
  name: string;
  record_type: string;
  record_code: string;
  title?: string;
  email?: string;
  status?: string;
  category?: string;
  state_group?: string;
  assigned_to?: string;
  reference_type?: string;
  reference_code?: string;
  event_at?: string;
  numeric_value?: number;
  payload: string;
  creation?: string;
  modified?: string;
}

export interface CrmRecordIndexes {
  title?: string | null;
  email?: string | null;
  status?: string | null;
  category?: string | null;
  stateGroup?: string | null;
  assignedTo?: string | null;
  referenceType?: string | null;
  referenceCode?: string | null;
  eventAt?: string | null;
  numericValue?: number | null;
  searchText?: string | null;
}

export interface ListCrmRecordsOptions {
  filters?: {
    status?: string;
    category?: string;
    state_group?: string;
    assigned_to?: string;
    reference_type?: string;
    reference_code?: string;
    email?: string;
  };
  q?: string;
  orderBy?: string;
  start?: number;
  pageLength?: number;
}

export function buildCrmRecordDocument<T extends object>(
  recordType: string,
  recordCode: string,
  payload: T,
  indexes: CrmRecordIndexes = {},
): Record<string, unknown> {
  return {
    record_type: recordType,
    record_code: recordCode,
    title: indexes.title,
    email: indexes.email,
    status: indexes.status,
    category: indexes.category,
    state_group: indexes.stateGroup,
    assigned_to: indexes.assignedTo,
    reference_type: indexes.referenceType,
    reference_code: indexes.referenceCode,
    event_at: indexes.eventAt,
    numeric_value: indexes.numericValue,
    search_text: indexes.searchText?.slice(0, 1_000) ?? undefined,
    payload: JSON.stringify(payload),
  };
}

export function parseCrmRecordDocument<T>(document: Record<string, unknown>): T {
  const payload = document.payload;
  if (typeof payload !== "string") throw new Error("CRM record payload is missing");
  return JSON.parse(payload) as T;
}

export async function listCrmRecords<T>(
  client: ErpClient,
  recordType: string,
  options: ListCrmRecordsOptions = {},
): Promise<{ items: T[]; total: number }> {
  const result = await client.call<{ items: ErpCrmRecordDocument[]; total: number }>(
    "amni_bridge.api.list_crm_records",
    {
      record_type: recordType,
      filters: options.filters ?? {},
      q: options.q,
      order_by: options.orderBy ?? "modified desc",
      start: options.start ?? 0,
      page_length: options.pageLength ?? 20,
    },
  );
  return {
    items: result.items.map((item) => parseCrmRecordDocument<T>(item as unknown as Record<string, unknown>)),
    total: result.total,
  };
}
