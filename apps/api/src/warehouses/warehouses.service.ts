import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateWarehouseInput,
  type StockLevel,
  type UpdateWarehouseInput,
  type Warehouse,
  type WarehouseDetail,
  type WarehouseListQuery,
  type WarehouseListResponse,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();

const SORT_WHITELIST = new Set([
  "name",
  "location",
  "manager",
  "status",
  "isDefault",
  "createdAt",
  "updatedAt",
]);

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

type SeedWarehouse = Omit<Warehouse, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  stock: StockLevel[];
};

const SEED: SeedWarehouse[] = [
  {
    code: "WH-0001",
    name: "Main Store",
    location: "450 Market St, San Francisco, CA",
    manager: "Amara Osei",
    status: "active",
    isDefault: true,
    createdAt: iso(240),
    updatedAt: iso(6),
    stock: [
      stockRow("WH-0001", "PRD-0001", 24, 3, 10),
      stockRow("WH-0001", "PRD-0003", 6, 2, 8),
      stockRow("WH-0001", "PRD-0004", 40, 5, 20),
      stockRow("WH-0001", "PRD-0005", 18, 0, 12),
      stockRow("WH-0001", "PRD-0006", 12, 1, 10),
      stockRow("WH-0001", "PRD-0007", 30, 4, 15),
    ],
  },
  {
    code: "WH-0002",
    name: "Regional Warehouse",
    location: "900 Harbor Bay Pkwy, Oakland, CA",
    manager: "Theo Lindqvist",
    status: "active",
    isDefault: false,
    createdAt: iso(200),
    updatedAt: iso(9),
    stock: [
      stockRow("WH-0002", "PRD-0001", 160, 22, 60),
      stockRow("WH-0002", "PRD-0002", 24, 4, 12),
      stockRow("WH-0002", "PRD-0003", 85, 15, 40),
      stockRow("WH-0002", "PRD-0004", 210, 30, 100),
      stockRow("WH-0002", "PRD-0008", 55, 0, 40),
      stockRow("WH-0002", "PRD-0009", 300, 0, 200),
      stockRow("WH-0002", "PRD-0010", 40, 0, 60),
    ],
  },
  {
    code: "WH-0003",
    name: "Workshop",
    location: "1200 Folsom St, San Francisco, CA",
    manager: "Grace Liu",
    status: "active",
    isDefault: false,
    createdAt: iso(150),
    updatedAt: iso(4),
    stock: [
      stockRow("WH-0003", "PRD-0001", 12, 6, 10),
      stockRow("WH-0003", "PRD-0002", 4, 2, 6),
      stockRow("WH-0003", "PRD-0003", 9, 3, 8),
      stockRow("WH-0003", "PRD-0011", 18, 0, 10),
      stockRow("WH-0003", "PRD-0012", 22, 5, 12),
    ],
  },
  {
    code: "WH-0004",
    name: "Returns Center",
    location: "7800 Raley Blvd, Sacramento, CA",
    manager: "Elena Vasquez",
    status: "inactive",
    isDefault: false,
    createdAt: iso(90),
    updatedAt: iso(30),
    stock: [
      stockRow("WH-0004", "PRD-0001", 8, 0, 15),
      stockRow("WH-0004", "PRD-0004", 25, 0, 20),
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
    createdAt: iso(45),
    updatedAt: iso(3),
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
  },
  {
    code: "WH-0006",
    name: "Showroom",
    location: "280 University Ave, Palo Alto, CA",
    manager: "Priya Raman",
    status: "active",
    isDefault: false,
    createdAt: iso(10),
    updatedAt: iso(2),
    stock: [
      stockRow("WH-0006", "PRD-0001", 4, 0, 5),
      stockRow("WH-0006", "PRD-0002", 2, 0, 3),
      stockRow("WH-0006", "PRD-0005", 6, 0, 4),
      stockRow("WH-0006", "PRD-0011", 5, 0, 4),
      stockRow("WH-0006", "PRD-0012", 3, 1, 4),
    ],
  },
];

const toWarehouse = (seed: SeedWarehouse): Warehouse => ({
  code: seed.code,
  name: seed.name,
  location: seed.location,
  manager: seed.manager,
  status: seed.status,
  isDefault: seed.isDefault,
  createdAt: seed.createdAt,
  updatedAt: seed.updatedAt,
});

function nextCode(records: Warehouse[]): string {
  const max = records.reduce((highest, warehouse) => {
    const number = Number(warehouse.code.slice(3));
    return number > highest ? number : highest;
  }, 0);
  return `WH-${String(max + 1).padStart(4, "0")}`;
}

/**
 * Reference data for the Demo Co tenant. This module is the only inventory
 * surface until the ERP gateway lands (M5); endpoints then read from the
 * tenant ERPNext site and keep the same contract.
 */
@Injectable()
export class WarehousesService {
  private records: Warehouse[] = SEED.map(toWarehouse);

  list(query: WarehouseListQuery): WarehouseListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((warehouse) => {
      if (query.status && warehouse.status !== query.status) return false;
      if (!q) return true;
      return [warehouse.code, warehouse.name, warehouse.location ?? "", warehouse.manager ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const whitelisted = query.sortBy !== undefined && SORT_WHITELIST.has(query.sortBy);
    const sortBy = whitelisted ? query.sortBy : "createdAt";
    const sortDir = whitelisted && query.sortDir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortBy as keyof Warehouse];
      const bValue = b[sortBy as keyof Warehouse];
      if (aValue === bValue) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      return aValue < bValue ? -1 * sortDir : sortDir;
    });

    const page = query.page;
    const pageSize = query.pageSize;
    const start = (page - 1) * pageSize;
    return {
      items: sorted.slice(start, start + pageSize),
      meta: { total: sorted.length, page, pageSize },
    };
  }

  detail(code: string): WarehouseDetail {
    const warehouse = this.records.find((record) => record.code === code);
    if (!warehouse) {
      throw new ApiException({
        code: ErrorCode.NOT_FOUND,
        status: 404,
        message: `Warehouse ${code} not found`,
      });
    }
    const seed = SEED.find((record) => record.code === code);
    const stock = seed ? seed.stock : [];
    const lowStock = stock.filter((row) => row.onHand < row.reorderLevel);
    return { ...warehouse, stock, lowStock };
  }

  create(input: CreateWarehouseInput): Warehouse {
    const warehouse: Warehouse = {
      code: nextCode(this.records),
      name: input.name,
      location: input.location,
      manager: input.manager,
      status: input.status ?? "active",
      isDefault: input.isDefault ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.records.push(warehouse);
    return warehouse;
  }

  update(code: string, input: UpdateWarehouseInput): Warehouse {
    const warehouse = this.records.find((record) => record.code === code);
    if (!warehouse) {
      throw new ApiException({
        code: ErrorCode.NOT_FOUND,
        status: 404,
        message: `Warehouse ${code} not found`,
      });
    }
    if (input.name !== undefined) warehouse.name = input.name;
    if (input.location !== undefined) warehouse.location = input.location;
    if (input.manager !== undefined) warehouse.manager = input.manager;
    if (input.status !== undefined) warehouse.status = input.status;
    if (input.isDefault !== undefined) warehouse.isDefault = input.isDefault;
    warehouse.updatedAt = new Date().toISOString();
    return warehouse;
  }

  remove(code: string): void {
    const index = this.records.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({
        code: ErrorCode.NOT_FOUND,
        status: 404,
        message: `Warehouse ${code} not found`,
      });
    }
    this.records.splice(index, 1);
  }
}
