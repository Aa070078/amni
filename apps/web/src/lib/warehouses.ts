import type {
  CreateWarehouseInput,
  StockLevel,
  UpdateWarehouseInput,
  Warehouse,
  WarehouseDetail,
  WarehouseListQuery,
  WarehouseListResponse,
} from "@amni/shared";
import { AmniApiError, apiRequest, toQueryString } from "./client";

export class WarehousesApiError extends AmniApiError {}

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

function stockRow(
  warehouseCode: string,
  productCode: string,
  onHand: number,
  reserved: number,
  reorderLevel: number,
): StockLevel {
  return {
    productCode,
    warehouseCode,
    onHand,
    reserved,
    available: Math.max(0, onHand - reserved),
    reorderLevel,
  };
}

const DEMO_WAREHOUSES_DETAIL: WarehouseDetail[] = [
  {
    code: "WH-0001",
    name: "Main Store",
    location: "450 Market St, San Francisco, CA",
    manager: "Amara Osei",
    status: "active",
    isDefault: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-08-04T00:00:00.000Z",
    stock: [
      stockRow("WH-0001", "PRD-0001", 24, 3, 10),
      stockRow("WH-0001", "PRD-0003", 6, 2, 8),
      stockRow("WH-0001", "PRD-0004", 40, 5, 20),
      stockRow("WH-0001", "PRD-0005", 18, 0, 12),
      stockRow("WH-0001", "PRD-0006", 12, 1, 10),
      stockRow("WH-0001", "PRD-0007", 30, 4, 15),
    ],
    lowStock: [stockRow("WH-0001", "PRD-0003", 6, 2, 8)],
  },
  {
    code: "WH-0002",
    name: "Regional Warehouse",
    location: "900 Harbor Bay Pkwy, Oakland, CA",
    manager: "Theo Lindqvist",
    status: "active",
    isDefault: false,
    createdAt: "2026-06-15T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    stock: [
      stockRow("WH-0002", "PRD-0001", 160, 22, 60),
      stockRow("WH-0002", "PRD-0002", 24, 4, 12),
      stockRow("WH-0002", "PRD-0003", 85, 15, 40),
      stockRow("WH-0002", "PRD-0004", 210, 30, 100),
      stockRow("WH-0002", "PRD-0008", 55, 0, 40),
      stockRow("WH-0002", "PRD-0009", 300, 0, 200),
      stockRow("WH-0002", "PRD-0010", 40, 0, 60),
    ],
    lowStock: [],
  },
  {
    code: "WH-0003",
    name: "Workshop",
    location: "1200 Folsom St, San Francisco, CA",
    manager: "Grace Liu",
    status: "active",
    isDefault: false,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-08-06T00:00:00.000Z",
    stock: [
      stockRow("WH-0003", "PRD-0001", 12, 6, 10),
      stockRow("WH-0003", "PRD-0002", 4, 2, 6),
      stockRow("WH-0003", "PRD-0003", 9, 3, 8),
      stockRow("WH-0003", "PRD-0011", 18, 0, 10),
      stockRow("WH-0003", "PRD-0012", 22, 5, 12),
    ],
    lowStock: [stockRow("WH-0003", "PRD-0002", 4, 2, 6)],
  },
  {
    code: "WH-0004",
    name: "Returns Center",
    location: "7800 Raley Blvd, Sacramento, CA",
    manager: "Elena Vasquez",
    status: "inactive",
    isDefault: false,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
    stock: [
      stockRow("WH-0004", "PRD-0001", 8, 0, 15),
      stockRow("WH-0004", "PRD-0004", 25, 0, 20),
      stockRow("WH-0004", "PRD-0005", 6, 0, 8),
      stockRow("WH-0004", "PRD-0006", 3, 0, 6),
    ],
    lowStock: [
      stockRow("WH-0004", "PRD-0001", 8, 0, 15),
      stockRow("WH-0004", "PRD-0005", 6, 0, 8),
      stockRow("WH-0004", "PRD-0006", 3, 0, 6),
    ],
  },
  {
    code: "WH-0005",
    name: "E-Commerce Fulfillment",
    location: "1701 Automation Pkwy, San Jose, CA",
    manager: "Dario Beltran",
    status: "active",
    isDefault: false,
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-08-07T00:00:00.000Z",
    stock: [
      stockRow("WH-0005", "PRD-0001", 96, 14, 50),
      stockRow("WH-0005", "PRD-0004", 140, 18, 80),
      stockRow("WH-0005", "PRD-0005", 60, 8, 30),
      stockRow("WH-0005", "PRD-0006", 44, 6, 24),
      stockRow("WH-0005", "PRD-0007", 120, 12, 60),
      stockRow("WH-0005", "PRD-0008", 12, 0, 20),
      stockRow("WH-0005", "PRD-0009", 80, 0, 100),
      stockRow("WH-0005", "PRD-0010", 30, 0, 40),
    ],
    lowStock: [
      stockRow("WH-0005", "PRD-0008", 12, 0, 20),
      stockRow("WH-0005", "PRD-0009", 80, 0, 100),
      stockRow("WH-0005", "PRD-0010", 30, 0, 40),
    ],
  },
  {
    code: "WH-0006",
    name: "Showroom",
    location: "280 University Ave, Palo Alto, CA",
    manager: "Priya Raman",
    status: "active",
    isDefault: false,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-08T00:00:00.000Z",
    stock: [
      stockRow("WH-0006", "PRD-0001", 4, 0, 5),
      stockRow("WH-0006", "PRD-0002", 2, 0, 3),
      stockRow("WH-0006", "PRD-0005", 6, 0, 4),
      stockRow("WH-0006", "PRD-0011", 5, 0, 4),
      stockRow("WH-0006", "PRD-0012", 3, 1, 4),
    ],
    lowStock: [
      stockRow("WH-0006", "PRD-0001", 4, 0, 5),
      stockRow("WH-0006", "PRD-0002", 2, 0, 3),
      stockRow("WH-0006", "PRD-0012", 3, 1, 4),
    ],
  },
];

let localWarehousesStore: WarehouseDetail[] = [...DEMO_WAREHOUSES_DETAIL];

function filterDemoWarehouses(query: Partial<WarehouseListQuery>): WarehouseListResponse {
  const { page = 1, pageSize = 20, q, status } = query;
  const searchStr = (q ?? "").toLowerCase().trim();
  const filtered = localWarehousesStore.filter((w) => {
    if (status && w.status !== status) return false;
    if (!searchStr) return true;
    return (
      w.name.toLowerCase().includes(searchStr) ||
      w.code.toLowerCase().includes(searchStr) ||
      (w.location ?? "").toLowerCase().includes(searchStr) ||
      (w.manager ?? "").toLowerCase().includes(searchStr)
    );
  });
  const start = (page - 1) * pageSize;
  const items: Warehouse[] = filtered.slice(start, start + pageSize).map((w) => ({
    code: w.code,
    name: w.name,
    location: w.location ?? undefined,
    manager: w.manager ?? undefined,
    status: w.status,
    isDefault: w.isDefault,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  }));
  return { items, meta: { total: filtered.length, page, pageSize } };
}

export const warehousesClient = {
  async list(query: Partial<WarehouseListQuery> = {}): Promise<WarehouseListResponse> {
    try {
      return await apiRequest<WarehouseListResponse>(
        "/inventory/warehouses",
        toQueryString({
          page: query.page,
          pageSize: query.pageSize,
          q: query.q,
          sortBy: query.sortBy,
          sortDir: query.sortDir,
          status: query.status,
        }),
      );
    } catch {
      return filterDemoWarehouses(query);
    }
  },

  async detail(code: string): Promise<WarehouseDetail> {
    try {
      return await apiRequest<WarehouseDetail>("/inventory/warehouses", `/${encodeURIComponent(code)}`);
    } catch {
      const warehouse = localWarehousesStore.find((w) => w.code === code);
      if (!warehouse) throw new WarehousesApiError(`Warehouse ${code} not found`, { code: "NOT_FOUND", status: 404 });
      return warehouse;
    }
  },

  async create(input: CreateWarehouseInput): Promise<Warehouse> {
    try {
      return await apiRequest<Warehouse>("/inventory/warehouses", "/", { method: "POST", body: input });
    } catch {
      const code = `WH-${String(localWarehousesStore.length + 1).padStart(4, "0")}`;
      const newWh: WarehouseDetail = {
        code,
        name: input.name,
        location: input.location ?? undefined,
        manager: input.manager ?? undefined,
        status: input.status ?? "active",
        isDefault: input.isDefault ?? false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stock: [],
        lowStock: [],
      };
      localWarehousesStore.unshift(newWh);
      return newWh;
    }
  },

  async update(code: string, input: UpdateWarehouseInput): Promise<Warehouse> {
    try {
      return await apiRequest<Warehouse>("/inventory/warehouses", `/${encodeURIComponent(code)}`, {
        method: "PATCH",
        body: input,
      });
    } catch {
      const warehouse = localWarehousesStore.find((w) => w.code === code);
      if (!warehouse) throw new WarehousesApiError(`Warehouse ${code} not found`, { code: "NOT_FOUND", status: 404 });
      Object.assign(warehouse, input, { updatedAt: new Date().toISOString() });
      return warehouse;
    }
  },

  async remove(code: string): Promise<void> {
    try {
      await apiRequest<void>("/inventory/warehouses", `/${encodeURIComponent(code)}`, { method: "DELETE" });
    } catch {
      localWarehousesStore = localWarehousesStore.filter((w) => w.code !== code);
    }
  },
};

export function warehouseStockValue(stock: StockLevel[]): number {
  return stock.reduce(
    (sum, row) => sum + row.onHand * (WAREHOUSE_PRODUCT_PRICES[row.productCode] ?? 0),
    0,
  );
}
