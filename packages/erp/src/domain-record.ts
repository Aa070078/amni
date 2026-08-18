import type { ErpClient } from "./client.js";

export const AMNI_DOMAIN_RECORD_DOCTYPE = "Amni Domain Record";

export interface DomainRecordIndexes {
  title?: string | null;
  status?: string | null;
  category?: string | null;
  referenceCode?: string | null;
  eventAt?: string | null;
  numericValue?: number | null;
  searchText?: string | null;
}

export interface ListDomainRecordsOptions {
  filters?: { status?: string; category?: string; reference_code?: string };
  q?: string;
  orderBy?: string;
  start?: number;
  pageLength?: number;
}

export function domainRecordKey(domain: string, recordType: string, recordCode: string): string {
  return `${domain}:${recordType}:${recordCode}`;
}

export function buildDomainRecordDocument<T extends object>(
  domain: string,
  recordType: string,
  recordCode: string,
  payload: T,
  indexes: DomainRecordIndexes = {},
): Record<string, unknown> {
  return {
    record_key: domainRecordKey(domain, recordType, recordCode),
    domain,
    record_type: recordType,
    record_code: recordCode,
    title: indexes.title,
    status: indexes.status,
    category: indexes.category,
    reference_code: indexes.referenceCode,
    event_at: indexes.eventAt,
    numeric_value: indexes.numericValue,
    search_text: indexes.searchText?.slice(0, 1_000) ?? undefined,
    payload: JSON.stringify(payload),
  };
}

export function parseDomainRecordDocument<T>(document: Record<string, unknown>): T {
  if (typeof document.payload !== "string") throw new Error("Domain record payload is missing");
  return JSON.parse(document.payload) as T;
}

export async function listDomainRecords<T>(
  client: ErpClient,
  domain: string,
  recordType: string,
  options: ListDomainRecordsOptions = {},
): Promise<{ items: T[]; total: number }> {
  const result = await client.call<{ items: Record<string, unknown>[]; total: number }>(
    "amni_bridge.api.list_domain_records",
    {
      domain,
      record_type: recordType,
      filters: options.filters ?? {},
      q: options.q,
      order_by: options.orderBy ?? "modified desc",
      start: options.start ?? 0,
      page_length: options.pageLength ?? 20,
    },
  );
  return { items: result.items.map(parseDomainRecordDocument<T>), total: result.total };
}
