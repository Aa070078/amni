import type {
  CreateProductInput,
  Product,
  ProductListQuery,
  ProductListResponse,
  UpdateProductInput,
} from "@amni/shared";
import { AmniApiError, apiRequest, toQueryString } from "./client";

export class ProductsApiError extends AmniApiError {}

const DEMO_PRODUCTS: Product[] = [
  { code: "PRD-0001", sku: "NIM-LED-2000", name: "Nimbus LED Panel", category: "lighting", unit: "pcs", price: 149, cost: 89, currency: "USD", status: "active", description: "Recessed panel luminaire, 4000K, sized for office ceilings.", reorderLevel: 25, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-08-09T00:00:00.000Z" },
  { code: "PRD-0002", sku: "ALU-SHT-15", name: "Aluminium Sheet", category: "materials", unit: "m2", price: 42.5, cost: 26, currency: "USD", status: "active", description: "1.5 mm alloy 5052 sheet, anodised, cut to size.", reorderLevel: 10, isStockItem: true, isSalesItem: true, isPurchaseItem: true, vatRate: 0, createdAt: "2026-07-03T00:00:00.000Z", updatedAt: "2026-08-08T00:00:00.000Z" },
  { code: "PRD-0003", sku: "ERG-CHAIR-100", name: "ErgoMesh Task Chair", category: "furniture", unit: "pcs", price: 289, cost: 168, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: "2026-07-06T00:00:00.000Z", updatedAt: "2026-08-06T00:00:00.000Z" },
  { code: "PRD-0004", sku: "AUR-LAMP-300", name: "Aurora Floor Lamp", category: "lighting", unit: "pcs", price: 179, cost: 104, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: "2026-07-08T00:00:00.000Z", updatedAt: "2026-08-05T00:00:00.000Z" },
  { code: "PRD-0005", sku: "STD-DESK-160", name: "Standing Desk Pro 160", category: "furniture", unit: "pcs", price: 649, cost: 402, currency: "USD", status: "active", reorderLevel: 5, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: "2026-07-10T00:00:00.000Z", updatedAt: "2026-08-07T00:00:00.000Z" },
  { code: "PRD-0006", sku: "MDF-PNL-018", name: "MDF Panel 18mm", category: "materials", unit: "m2", price: 18.75, cost: 9.4, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: false, isPurchaseItem: true, vatRate: 20, createdAt: "2026-07-12T00:00:00.000Z", updatedAt: "2026-08-04T00:00:00.000Z" },
  { code: "PRD-0007", sku: "ARC-CHAIR-500", name: "Arc Swivel Chair", category: "furniture", unit: "pcs", price: 359, cost: 210, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: "2026-07-14T00:00:00.000Z", updatedAt: "2026-08-03T00:00:00.000Z" },
  { code: "PRD-0008", sku: "HAL-TRK-400", name: "Halide Track Light", category: "lighting", unit: "pcs", price: 64, cost: 33, currency: "USD", status: "active", reorderLevel: 12, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-08-02T00:00:00.000Z" },
  { code: "PRD-0009", sku: "STL-SHLV-900", name: "Kraftholmen Steel Shelving", category: "furniture", unit: "set", price: 219, cost: 127, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: "2026-07-18T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" },
  { code: "PRD-0010", sku: "NEO-STRP-005", name: "NeonCove LED Strip 5m", category: "lighting", unit: "roll", price: 39.5, cost: 18, currency: "USD", status: "disabled", description: "Discontinued finish; clearance stock only.", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: "2026-07-20T00:00:00.000Z", updatedAt: "2026-07-31T00:00:00.000Z" },
  { code: "PRD-0011", sku: "MON-ARM-AR3", name: "Posturite Monitor Arm", category: "office", unit: "pcs", price: 129, cost: 71, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: "2026-07-22T00:00:00.000Z", updatedAt: "2026-07-30T00:00:00.000Z" },
  { code: "PRD-0012", sku: "PPR-A4-80", name: "A4 Copy Paper 80gsm", category: "office", unit: "pack", price: 6.25, cost: 3.1, currency: "USD", status: "active", reorderLevel: 60, isStockItem: true, isSalesItem: true, isPurchaseItem: true, vatRate: 20, createdAt: "2026-07-24T00:00:00.000Z", updatedAt: "2026-07-29T00:00:00.000Z" },
  { code: "PRD-0013", sku: "NXK-KBD-001", name: "Nexus Wireless Keyboard", category: "office", unit: "pcs", price: 89, cost: 48, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: "2026-07-26T00:00:00.000Z", updatedAt: "2026-07-28T00:00:00.000Z" },
  { code: "PRD-0014", sku: "PLY-BRC-012", name: "Baltic Birch Plywood 12mm", category: "materials", unit: "m2", price: 24, cost: 12.6, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: false, isPurchaseItem: true, vatRate: 20, createdAt: "2026-07-28T00:00:00.000Z", updatedAt: "2026-07-27T00:00:00.000Z" },
  { code: "PRD-0015", sku: "SAB-LAMP-600", name: "Sable Desk Lamp", category: "lighting", unit: "pcs", price: 74, cost: 39, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: "2026-07-30T00:00:00.000Z", updatedAt: "2026-07-26T00:00:00.000Z" },
  { code: "PRD-0016", sku: "HUS-PNL-800", name: "Hush Acoustic Panel", category: "office", unit: "pcs", price: 110, cost: 61, currency: "USD", status: "active", reorderLevel: 0, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-07-25T00:00:00.000Z" },
  { code: "PRD-0017", sku: "WIL-SOFA-700", name: "Willow Lounge Sofa", category: "furniture", unit: "pcs", price: 1249, cost: 780, currency: "USD", status: "active", reorderLevel: 3, isStockItem: true, isSalesItem: true, isPurchaseItem: false, vatRate: 20, createdAt: "2026-08-05T00:00:00.000Z", updatedAt: "2026-07-24T00:00:00.000Z" },
  { code: "PRD-0018", sku: "GLS-PNL-010", name: "Tempered Glass Panel 10mm", category: "materials", unit: "m2", price: 68, cost: 37, currency: "USD", status: "draft", reorderLevel: 0, isStockItem: true, isSalesItem: false, isPurchaseItem: true, vatRate: 20, createdAt: "2026-08-08T00:00:00.000Z", updatedAt: "2026-07-23T00:00:00.000Z" },
];

let localProductsStore: Product[] = [...DEMO_PRODUCTS];

function filterDemoProducts(query: Partial<ProductListQuery>): ProductListResponse {
  const { page = 1, pageSize = 20, q, category, status } = query;
  const searchStr = (q ?? "").toLowerCase().trim();
  const filtered = localProductsStore.filter((p) => {
    if (category && category !== "all" && p.category !== category) return false;
    if (status && p.status !== status) return false;
    if (!searchStr) return true;
    return (
      p.name.toLowerCase().includes(searchStr) ||
      p.code.toLowerCase().includes(searchStr) ||
      p.sku.toLowerCase().includes(searchStr) ||
      p.category.toLowerCase().includes(searchStr)
    );
  });
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);
  return { items, meta: { total: filtered.length, page, pageSize } };
}

export const productsClient = {
  async list(query: Partial<ProductListQuery> = {}): Promise<ProductListResponse> {
    try {
      return await apiRequest<ProductListResponse>(
        "/inventory/products",
        toQueryString({
          page: query.page,
          pageSize: query.pageSize,
          q: query.q,
          sortBy: query.sortBy,
          sortDir: query.sortDir,
          category: query.category,
          status: query.status,
        }),
      );
    } catch {
      return filterDemoProducts(query);
    }
  },

  async detail(code: string): Promise<Product> {
    try {
      return await apiRequest<Product>("/inventory/products", `/${encodeURIComponent(code)}`);
    } catch {
      const product = localProductsStore.find((p) => p.code === code);
      if (!product) throw new ProductsApiError(`Product ${code} not found`, { code: "NOT_FOUND", status: 404 });
      return product;
    }
  },

  async create(input: CreateProductInput): Promise<Product> {
    try {
      return await apiRequest<Product>("/inventory/products", "/", { method: "POST", body: input });
    } catch {
      const code = `PRD-${String(localProductsStore.length + 1).padStart(4, "0")}`;
      const newProduct: Product = {
        code,
        sku: input.sku,
        name: input.name,
        category: input.category,
        unit: input.unit ?? "pcs",
        price: input.price,
        cost: input.cost ?? 0,
        currency: input.currency ?? "USD",
        status: input.status ?? "active",
        description: input.description,
        reorderLevel: input.reorderLevel ?? 0,
        isStockItem: input.isStockItem ?? true,
        isSalesItem: input.isSalesItem ?? true,
        isPurchaseItem: input.isPurchaseItem ?? false,
        vatRate: input.vatRate ?? 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localProductsStore.unshift(newProduct);
      return newProduct;
    }
  },

  async update(code: string, input: UpdateProductInput): Promise<Product> {
    try {
      return await apiRequest<Product>("/inventory/products", `/${encodeURIComponent(code)}`, {
        method: "PATCH",
        body: input,
      });
    } catch {
      const product = localProductsStore.find((p) => p.code === code);
      if (!product) throw new ProductsApiError(`Product ${code} not found`, { code: "NOT_FOUND", status: 404 });
      Object.assign(product, input, { updatedAt: new Date().toISOString() });
      return product;
    }
  },

  async remove(code: string): Promise<void> {
    try {
      await apiRequest<void>("/inventory/products", `/${encodeURIComponent(code)}`, { method: "DELETE" });
    } catch {
      localProductsStore = localProductsStore.filter((p) => p.code !== code);
    }
  },
};
