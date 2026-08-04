import { ErrorCode } from "@amni/shared";
import { ErpError } from "./errors.js";
import { mapErrorResponse } from "./mapping.js";
import { ERP_API_PREFIX, type ErpClientConfig, type ErpListOptions, type ErpListResult } from "./types.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Thin, typed client over the official Frappe REST API.
 *
 * Auth: `Authorization: token <api_key>:<api_secret>` (CSRF-exempt by design).
 * Every call forwards an `X-Frappe-Request-Id` derived from the platform
 * requestId so the worker/API and ERPNext logs can be correlated.
 *
 * This class is intentionally dumb: it holds no tenant context. The Amni API
 * gateway resolves the tenant's ERPInstance and passes its config in.
 */
export class ErpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly requestId?: string;
  private readonly allowHost?: string;

  constructor(config: ErpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.requestId = config.requestId;
    this.allowHost = config.allowHost;
  }

  get baseUrlSafe(): string {
    return this.baseUrl;
  }

  private buildUrl(path: string): URL {
    const url = new URL(`${this.baseUrl}${ERP_API_PREFIX}${path}`);
    if (this.allowHost && url.hostname !== this.allowHost) {
      throw new ErpError(ErrorCode.ERP_SSRF_BLOCKED, `Blocked request to disallowed host ${url.hostname}`);
    }
    return url;
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    init?: { params?: Record<string, unknown>; body?: unknown },
  ): Promise<T> {
    const url = this.buildUrl(path);
    for (const [key, value] of Object.entries(init?.params ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, typeof value === "string" ? value : JSON.stringify(value));
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `token ${this.apiKey}:${this.apiSecret}`,
      ...(this.requestId ? { "X-Frappe-Request-Id": this.requestId } : {}),
    };

    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await fetch(url, {
          method,
          headers,
          body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
          signal: controller.signal,
        });

        const text = await res.text();
        const body = text ? safeJson(text) : undefined;

        if (!res.ok) {
          throw mapErrorResponse(res.status, body, this.requestId);
        }
        return body as T;
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof ErpError) {
          const retriable = err.status !== null && RETRYABLE_STATUS.has(err.status);
          if (!retriable || attempt >= this.maxRetries) throw err;
        } else {
          // Network / abort errors. Abort (timeout) is not retried — failing fast
          // is safer than piling load on a slow tenant site.
          const isAbort = err instanceof Error && err.name === "AbortError";
          if (isAbort || attempt >= this.maxRetries) {
            throw new ErpError(
              isAbort ? ErrorCode.ERP_TIMEOUT : ErrorCode.ERP_UNREACHABLE,
              isAbort ? "ERPNext request timed out" : `ERPNext unreachable: ${(err as Error).message}`,
              { cause: err },
            );
          }
        }
        lastErr = err;
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr;
  }

  /** GET /resource/{doctype}?filters=... */
  async list<T extends object>(doctype: string, options: ErpListOptions = {}): Promise<ErpListResult<T>> {
    const data = await this.request<{ data: T[] }>("GET", `/resource/${doctype}`, {
      params: {
        filters: options.filters,
        fields: options.fields,
        order_by: options.orderBy,
        limit_page_length: options.limitPageLength,
        start: options.start,
      },
    });
    const items = data.data;
    const hasMore = (options.limitPageLength ?? 0) > 0 && items.length >= (options.limitPageLength ?? 0);
    return { items, hasMore };
  }

  /** GET /resource/{doctype}/{name} */
  async get<T extends object>(doctype: string, name: string): Promise<T> {
    const data = await this.request<{ data: T }>("GET", `/resource/${doctype}/${encodeURIComponent(name)}`);
    return data.data;
  }

  /** POST /resource/{doctype} — create draft doc. */
  async create<T extends object>(doctype: string, doc: Record<string, unknown>): Promise<T> {
    const data = await this.request<{ data: T }>("POST", `/resource/${doctype}`, { body: doc });
    return data.data;
  }

  /** PUT /resource/{doctype}/{name} — update draft doc. */
  async update<T extends object>(doctype: string, name: string, doc: Record<string, unknown>): Promise<T> {
    const data = await this.request<{ data: T }>("PUT", `/resource/${doctype}/${encodeURIComponent(name)}`, {
      body: doc,
    });
    return data.data;
  }

  /** PUT /resource/{doctype}/{name}?action=submit — submit the doc. */
  async submit<T extends object>(doctype: string, name: string): Promise<T> {
    const data = await this.request<{ data: T }>("PUT", `/resource/${doctype}/${encodeURIComponent(name)}`, {
      params: { action: "submit" },
    });
    return data.data;
  }

  /** PUT /resource/{doctype}/{name}?action=cancel — cancel the doc. */
  async cancel<T extends object>(doctype: string, name: string): Promise<T> {
    const data = await this.request<{ data: T }>("PUT", `/resource/${doctype}/${encodeURIComponent(name)}`, {
      params: { action: "cancel" },
    });
    return data.data;
  }

  /** DELETE /resource/{doctype}/{name} */
  async delete(doctype: string, name: string): Promise<void> {
    await this.request("DELETE", `/resource/${doctype}/${encodeURIComponent(name)}`);
  }

  /** POST /method/{method} — whitelisted RPC. */
  async call<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
    const data = await this.request<{ message: T }>("POST", `/method/${method}`, { body: args });
    return data.message;
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}
