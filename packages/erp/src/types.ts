import type { CursorPagination } from "@amni/shared";

/** Docstatus convention shared with ERPNext: Draft=0, Submitted=1, Cancelled=2. */
export type DocStatus = 0 | 1 | 2;

export interface ErpResourceBase {
  name: string;
  creation?: string;
  modified?: string;
  docstatus?: DocStatus;
}

export interface ErpClientConfig {
  /** Tenant site base URL, e.g. https://acme.app.example.com */
  baseUrl: string;
  /** Service-account api_key */
  apiKey: string;
  /** Service-account api_secret */
  apiSecret: string;
  /** Request timeout in ms (default 15000). */
  timeoutMs?: number;
  /** Max retries on transient network failures (default 2). */
  maxRetries?: number;
  /** Caller-supplied correlation id forwarded to ERPNext. */
  requestId?: string;
  /** Set to only allow this host (defense-in-depth against SSRF). */
  allowHost?: string;
}

export interface ErpListOptions {
  filters?: Record<string, unknown>;
  fields?: string[];
  orderBy?: string;
  limitPageLength?: number;
  start?: number;
}

export interface ErpListResult<T> {
  items: T[];
  hasMore: boolean;
}

export interface ErpQueryOptions {
  filters?: Record<string, unknown>;
  q?: string;
  orderBy?: string;
  start?: number;
  pageLength?: number;
}

export interface ErpQueryResult<T> {
  items: T[];
  total: number;
}

export interface ErpLoginResult {
  sid: string;
  loggedUser: string;
}

/** Official REST API route prefixes (see https://docs.frappe.dev/api/rest). */
export const ERP_API_PREFIX = "/api/v1";

export function buildListFilters(pagination?: CursorPagination): Record<string, unknown> {
  return {
    limit_page_length: pagination?.limit ?? 20,
  };
}
