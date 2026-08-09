import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateProductInput,
  type Product,
  type ProductListQuery,
  type ProductListResponse,
  type UpdateProductInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();

const SORT_WHITELIST = new Set(["name", "price", "cost", "category", "createdAt"]);

const SEED: Product[] = [
  { code: "PRD-0001", sku: "NIM-LED-2000", name: "Nimbus LED Panel", category: "lighting", unit: "pcs", price: 149, cost: 89, currency: "USD", status: "active", description: "Recessed panel luminaire, 4000K, sized for office ceilings.", reorderLevel: 25, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: iso(40), updatedAt: iso(1) },
  { code: "PRD-0002", sku: "ALU-SHT-15", name: "Aluminium Sheet", category: "materials", unit: "m2", price: 42.5, cost: 26, currency: "USD", status: "active", description: "1.5 mm alloy 5052 sheet, anodised, cut to size.", reorderLevel: 10, isStockItem: true, isSalesItem: true, isPurchaseItem: true, vatRate: 0, createdAt: iso(38), updatedAt: iso(2) },
  { code: "PRD-0003", sku: "ERG-CHAIR-100", name: "ErgoMesh Task Chair", category: "furniture", unit: "pcs", price: 289, cost: 168, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: iso(35), updatedAt: iso(4) },
  { code: "PRD-0004", sku: "AUR-LAMP-300", name: "Aurora Floor Lamp", category: "lighting", unit: "pcs", price: 179, cost: 104, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: iso(33), updatedAt: iso(5) },
  { code: "PRD-0005", sku: "STD-DESK-160", name: "Standing Desk Pro 160", category: "furniture", unit: "pcs", price: 649, cost: 402, currency: "USD", status: "active", reorderLevel: 5, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: iso(31), updatedAt: iso(3) },
  { code: "PRD-0006", sku: "MDF-PNL-018", name: "MDF Panel 18mm", category: "materials", unit: "m2", price: 18.75, cost: 9.4, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: false, isPurchaseItem: true, vatRate: 20, createdAt: iso(29), updatedAt: iso(6) },
  { code: "PRD-0007", sku: "ARC-CHAIR-500", name: "Arc Swivel Chair", category: "furniture", unit: "pcs", price: 359, cost: 210, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: iso(27), updatedAt: iso(7) },
  { code: "PRD-0008", sku: "HAL-TRK-400", name: "Halide Track Light", category: "lighting", unit: "pcs", price: 64, cost: 33, currency: "USD", status: "active", reorderLevel: 12, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: iso(25), updatedAt: iso(8) },
  { code: "PRD-0009", sku: "STL-SHLV-900", name: "Kraftholmen Steel Shelving", category: "furniture", unit: "set", price: 219, cost: 127, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: iso(23), updatedAt: iso(9) },
  { code: "PRD-0010", sku: "NEO-STRP-005", name: "NeonCove LED Strip 5m", category: "lighting", unit: "roll", price: 39.5, cost: 18, currency: "USD", status: "disabled", description: "Discontinued finish; clearance stock only.", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: iso(21), updatedAt: iso(10) },
  { code: "PRD-0011", sku: "MON-ARM-AR3", name: "Posturite Monitor Arm", category: "office", unit: "pcs", price: 129, cost: 71, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: iso(19), updatedAt: iso(11) },
  { code: "PRD-0012", sku: "PPR-A4-80", name: "A4 Copy Paper 80gsm", category: "office", unit: "pack", price: 6.25, cost: 3.1, currency: "USD", status: "active", reorderLevel: 60, isStockItem: true, isSalesItem: true, isPurchaseItem: true, vatRate: 20, createdAt: iso(17), updatedAt: iso(12) },
  { code: "PRD-0013", sku: "NXK-KBD-001", name: "Nexus Wireless Keyboard", category: "office", unit: "pcs", price: 89, cost: 48, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: iso(15), updatedAt: iso(13) },
  { code: "PRD-0014", sku: "PLY-BRC-012", name: "Baltic Birch Plywood 12mm", category: "materials", unit: "m2", price: 24, cost: 12.6, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: false, isPurchaseItem: true, vatRate: 20, createdAt: iso(13), updatedAt: iso(14) },
  { code: "PRD-0015", sku: "SAB-LAMP-600", name: "Sable Desk Lamp", category: "lighting", unit: "pcs", price: 74, cost: 39, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: iso(11), updatedAt: iso(15) },
  { code: "PRD-0016", sku: "HUS-PNL-800", name: "Hush Acoustic Panel", category: "office", unit: "pcs", price: 110, cost: 61, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: iso(9), updatedAt: iso(16) },
  { code: "PRD-0017", sku: "WIL-SOFA-700", name: "Willow Lounge Sofa", category: "furniture", unit: "pcs", price: 1249, cost: 780, currency: "USD", status: "active", reorderLevel: 3, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: iso(5), updatedAt: iso(17) },
  { code: "PRD-0018", sku: "GLS-PNL-010", name: "Tempered Glass Panel 10mm", category: "materials", unit: "m2", price: 68, cost: 37, currency: "USD", status: "draft", reorderLevel: 0, isStockItem: true, isSalesItem: false, isPurchaseItem: true, vatRate: 20, createdAt: iso(2), updatedAt: iso(18) },
];

function nextCode(records: Product[]): string {
  const max = records.reduce((highest, product) => {
    const number = Number(product.code.slice(4));
    return number > highest ? number : highest;
  }, 0);
  return `PRD-${String(max + 1).padStart(4, "0")}`;
}

/**
 * Reference data for the Demo Co tenant. This module is the only inventory
 * products surface until the ERP gateway lands (M5); endpoints then read from
 * the tenant ERPNext site and keep the same contract.
 */
@Injectable()
export class ProductsService {
  private records: Product[] = [...SEED];

  list(query: ProductListQuery): ProductListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((product) => {
      if (query.category && product.category !== query.category) return false;
      if (query.status && product.status !== query.status) return false;
      if (!q) return true;
      return [product.name, product.sku, product.category, product.unit, product.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const whitelisted = query.sortBy !== undefined && SORT_WHITELIST.has(query.sortBy);
    const sortBy = whitelisted ? query.sortBy : "createdAt";
    const sortDir = whitelisted && query.sortDir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortBy as keyof Product];
      const bValue = b[sortBy as keyof Product];
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

  detail(code: string): Product {
    const product = this.records.find((record) => record.code === code);
    if (!product) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Product ${code} not found` });
    }
    return product;
  }

  create(input: CreateProductInput): Product {
    const product: Product = {
      code: nextCode(this.records),
      sku: input.sku,
      name: input.name,
      category: input.category,
      unit: input.unit ?? "pcs",
      price: input.price,
      cost: input.cost ?? 0,
      currency: input.currency ?? "USD",
      status: input.status ?? "draft",
      description: input.description,
      reorderLevel: input.reorderLevel ?? 0,
      isStockItem: input.isStockItem ?? true,
      isSalesItem: input.isSalesItem ?? true,
      isPurchaseItem: input.isPurchaseItem ?? false,
      vatRate: input.vatRate ?? 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.records.push(product);
    return product;
  }

  update(code: string, input: UpdateProductInput): Product {
    const product = this.records.find((record) => record.code === code);
    if (!product) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Product ${code} not found` });
    }
    if (input.sku !== undefined) product.sku = input.sku;
    if (input.name !== undefined) product.name = input.name;
    if (input.category !== undefined) product.category = input.category;
    if (input.unit !== undefined) product.unit = input.unit;
    if (input.price !== undefined) product.price = input.price;
    if (input.cost !== undefined) product.cost = input.cost;
    if (input.currency !== undefined) product.currency = input.currency;
    if (input.status !== undefined) product.status = input.status;
    if (input.description !== undefined) product.description = input.description;
    if (input.reorderLevel !== undefined) product.reorderLevel = input.reorderLevel;
    if (input.isStockItem !== undefined) product.isStockItem = input.isStockItem;
    if (input.isSalesItem !== undefined) product.isSalesItem = input.isSalesItem;
    if (input.isPurchaseItem !== undefined) product.isPurchaseItem = input.isPurchaseItem;
    if (input.vatRate !== undefined) product.vatRate = input.vatRate;
    product.updatedAt = new Date().toISOString();
    return product;
  }

  remove(code: string): void {
    const index = this.records.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Product ${code} not found` });
    }
    this.records.splice(index, 1);
  }
}
