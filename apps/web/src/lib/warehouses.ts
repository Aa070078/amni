import type {
  CreateWarehouseInput,
  StockLevel,
  UpdateWarehouseInput,
  Warehouse,
  WarehouseDetail,
  WarehouseListQuery,
  WarehouseListResponse,
} from "@amni/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";
const CSRF_COOKIE = "amni_csrf";

/**
 * Approximate per-product list prices (USD) used to estimate the value of
 * on-hand stock until the products module exposes a real price source.
 */
export const WAREHOUSE_PRODUCT_PRICES: Record<string, number> = {
  "PRD-0001": 240,
  "PRD-0002": 890,
  "PRD-0003": 620,
  "PRD-0004": 95,
  "PRD-0005": 120,
  "PRD-0006": 145,
  "PRD-0007": 85,
  "PRD-0008": 18,
  "PRD-0009": 12,
  "PRD-0010": 16,
  "PRD-0011": 210,
  "PRD-0012": 340,
};

export class WarehousesApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    opts: { code: string; status: number; fieldErrors?: Record<string, string[]> },
  ) {
    super(message);
    this.name = "WarehousesApiError";
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

  const res = await fetch(`${API_BASE}/inventory/warehouses${path}`, {
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
      throw new WarehousesApiError(envelope.error.message, {
        code: envelope.error.code,
        status: res.status,
        fieldErrors: envelope.error.fieldErrors,
      });
    }
    throw new WarehousesApiError("Unexpected response from server", {
      code: "internal_error",
      status: res.status,
    });
  }

  return envelope.data;
}

export const warehousesClient = {
  list(query: Partial<WarehouseListQuery> = {}): Promise<WarehouseListResponse> {
    const { page, pageSize, q, sortBy, sortDir, status } = query;
    return request<WarehouseListResponse>(
      `${toQueryString({ page, pageSize, q, sortBy, sortDir, status })}`,
    );
  },
  detail(code: string): Promise<WarehouseDetail> {
    return request<WarehouseDetail>(`/${encodeURIComponent(code)}`);
  },
  create(input: CreateWarehouseInput): Promise<Warehouse> {
    return request<Warehouse>("/", { method: "POST", body: input });
  },
  update(code: string, input: UpdateWarehouseInput): Promise<Warehouse> {
    return request<Warehouse>(`/${encodeURIComponent(code)}`, { method: "PATCH", body: input });
  },
  remove(code: string): Promise<void> {
    return request<void>(`/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
};

export function warehouseStockValue(stock: StockLevel[]): number {
  return stock.reduce(
    (sum, row) => sum + row.onHand * (WAREHOUSE_PRODUCT_PRICES[row.productCode] ?? 0),
    0,
  );
}
