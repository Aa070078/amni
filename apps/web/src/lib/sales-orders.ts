import type {
  CreateSalesOrderInput,
  CustomerSummary,
  SalesOrder,
  SalesOrderListQuery,
  SalesOrderListResponse,
  SalesOrderStatus,
  UpdateSalesOrderInput,
} from "@amni/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";
const CSRF_COOKIE = "amni_csrf";

export interface SalesOrderProductOption {
  code: string;
  name: string;
  uom: string;
  rate: number;
}

export interface SalesOrderOptions {
  customers: CustomerSummary[];
  products: SalesOrderProductOption[];
}

export class SalesOrdersApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, opts: { code: string; status: number; fieldErrors?: Record<string, string[]> }) {
    super(message);
    this.name = "SalesOrdersApiError";
    this.code = opts.code;
    this.status = opts.status;
    this.fieldErrors = opts.fieldErrors;
  }
}

function readCsrfToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]+)`));
  const token = match?.[1];
  return token ? decodeURIComponent(token) : undefined;
}

function toQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const raw = search.toString();
  return raw ? `?${raw}` : "";
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") headers["X-Request-Id"] = crypto.randomUUID();
  if (method !== "GET") {
    const csrf = readCsrfToken();
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  const res = await fetch(`${API_BASE}/sales/orders${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  if (res.status === 204) return undefined as T;

  const envelope = (await res.json().catch(() => null)) as
    | { ok: true; data: T }
    | { ok: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } }
    | null;

  if (!res.ok || !envelope || !envelope.ok) {
    if (envelope && !envelope.ok) {
      throw new SalesOrdersApiError(envelope.error.message, {
        code: envelope.error.code,
        status: res.status,
        fieldErrors: envelope.error.fieldErrors,
      });
    }
    throw new SalesOrdersApiError("Unexpected response from server", { code: "internal_error", status: res.status });
  }

  return envelope.data;
}

export const salesOrdersClient = {
  list(query: Partial<SalesOrderListQuery> = {}): Promise<SalesOrderListResponse> {
    const { page, pageSize, q, sortBy, sortDir, status } = query;
    return request<SalesOrderListResponse>(`${toQueryString({ page, pageSize, q, sortBy, sortDir, status })}`);
  },
  options(): Promise<SalesOrderOptions> {
    return request<SalesOrderOptions>("/options");
  },
  detail(code: string): Promise<SalesOrder> {
    return request<SalesOrder>(`/${encodeURIComponent(code)}`);
  },
  create(input: CreateSalesOrderInput): Promise<SalesOrder> {
    return request<SalesOrder>("/", { method: "POST", body: input });
  },
  update(code: string, input: UpdateSalesOrderInput): Promise<SalesOrder> {
    return request<SalesOrder>(`/${encodeURIComponent(code)}`, { method: "PATCH", body: input });
  },
  changeStatus(code: string, status: SalesOrderStatus): Promise<SalesOrder> {
    return request<SalesOrder>(`/${encodeURIComponent(code)}/status`, { method: "PATCH", body: { status } });
  },
  remove(code: string): Promise<void> {
    return request<void>(`/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
};

export function formatOrderDate(date: string | null | undefined): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}
