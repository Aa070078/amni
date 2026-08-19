import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@amni/shared";
import { ErpError } from "@amni/erp";
import type * as ErpModule from "@amni/erp";

import { ProductsService } from "./products.service";
import { ErpGatewayService, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";

const mocks = vi.hoisted(() => {
  const client = {
    list: vi.fn(),
    query: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  return {
    membership: { findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
    createErpClientForTenant: vi.fn(async () => client),
    client,
  };
});

vi.mock("@amni/db", () => ({
  prisma: { membership: mocks.membership, auditLog: mocks.auditLog },
}));

vi.mock("@amni/erp", async (importOriginal) => ({
  ...(await importOriginal<typeof ErpModule>()),
  createErpClientForTenant: mocks.createErpClientForTenant,
}));

const USER: GatewayUser = { id: "user-1", email: "owner@acme.com", role: "USER" };
const META: GatewayRequestMeta = { ip: "10.0.0.1", requestId: "req-1" };
const COMPANY = "company-1";

const ITEM_DOCS = [
  { name: "NIM-LED-2000", item_code: "NIM-LED-2000", item_name: "Nimbus LED Panel", item_group: "Lighting", stock_uom: "pcs", standard_rate: 149, valuation_rate: 89, disabled: 0, safety_stock: 25, description: "Recessed panel luminaire.", creation: "2026-01-01 09:00:00", modified: "2026-06-01 09:00:00" },
  { name: "ALU-SHT-15", item_code: "ALU-SHT-15", item_name: "Aluminium Sheet", item_group: "Materials", stock_uom: "m2", standard_rate: 42.5, valuation_rate: 26, disabled: 0, safety_stock: 10, creation: "2026-02-01 09:00:00", modified: "2026-06-02 09:00:00" },
  { name: "MON-ARM-AR3", item_code: "MON-ARM-AR3", item_name: "Posturite Monitor Arm", item_group: "Office", stock_uom: "pcs", standard_rate: 129, valuation_rate: 71, disabled: 1, safety_stock: 0, creation: "2026-03-01 09:00:00", modified: "2026-06-03 09:00:00" },
];

function mockItemList() {
  mocks.client.query.mockImplementation(async (_doctype: string, options: { filters?: Record<string, unknown>; q?: string; orderBy?: string; start?: number; pageLength?: number }) => {
    const q = (options.q ?? "").toLowerCase();
    const filtered = ITEM_DOCS.filter((doc) => Object.entries(options.filters ?? {}).every(([field, value]) => String(doc[field as keyof typeof doc] ?? "") === String(value)))
      .filter((doc) => !q || Object.values(doc).some((value) => String(value ?? "").toLowerCase().includes(q)));
    const [field, direction] = (options.orderBy ?? "creation desc").split(" ");
    filtered.sort((a, b) => {
      const left = a[field as keyof typeof a];
      const right = b[field as keyof typeof b];
      const compared = typeof left === "number" && typeof right === "number" ? left - right : String(left ?? "").localeCompare(String(right ?? ""));
      return compared * (direction === "asc" ? 1 : -1);
    });
    const start = options.start ?? 0;
    return { items: filtered.slice(start, start + (options.pageLength ?? 20)), total: filtered.length };
  });
}

describe("ProductsService", () => {
  let service: ProductsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createErpClientForTenant.mockResolvedValue(mocks.client);
    mocks.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.membership.findFirst.mockResolvedValue({ companyId: COMPANY });
    service = new ProductsService(new ErpGatewayService());
  });

  describe("list", () => {
    it("returns items from the tenant site mapped to the contract, sorted by createdAt desc", async () => {
      mockItemList();

      const result = await service.list(USER, META, { page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(3);
      expect(result.items[0].code).toBe("MON-ARM-AR3");
      expect(result.items[0].status).toBe("disabled");
      expect(result.items[1].status).toBe("active");
      expect(result.items[0].price).toBe(129);
      expect(result.items[0].cost).toBe(71);
      expect(result.items[0].reorderLevel).toBe(0);
    });

    it("filters by category and status", async () => {
      mockItemList();

      const result = await service.list(USER, META, { page: 1, pageSize: 20, category: "Materials", status: "active" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("ALU-SHT-15");
    });

    it("searches case-insensitively across name and sku", async () => {
      mockItemList();

      const result = await service.list(USER, META, { page: 1, pageSize: 20, q: "monitor" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("MON-ARM-AR3");
    });

    it("sorts by price ascending when requested", async () => {
      mockItemList();

      const result = await service.list(USER, META, { page: 1, pageSize: 20, sortBy: "price", sortDir: "asc" });

      expect(result.items.map((p) => p.price)).toEqual([42.5, 129, 149]);
    });

    it("paginates", async () => {
      mockItemList();

      const page1 = await service.list(USER, META, { page: 1, pageSize: 2 });
      const page2 = await service.list(USER, META, { page: 2, pageSize: 2 });

      expect(page1.items.length).toBe(2);
      expect(page2.items.length).toBe(1);
    });
  });

  describe("detail", () => {
    it("returns the mapped item", async () => {
      mocks.client.get.mockResolvedValue(ITEM_DOCS[0]);

      const product = await service.detail(USER, META, "NIM-LED-2000");

      expect(product.sku).toBe("NIM-LED-2000");
      expect(product.category).toBe("Lighting");
      expect(product.currency).toBe("USD");
      expect(mocks.client.get).toHaveBeenCalledWith("Item", "NIM-LED-2000");
    });

    it("throws not_found for an unknown item", async () => {
      mocks.client.get.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.detail(USER, META, "NOPE")).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });
  });

  describe("create", () => {
    it("creates the Item doc on the tenant site and audits", async () => {
      mocks.client.create.mockResolvedValue({ ...ITEM_DOCS[0], name: "NIM-LED-2001" });

      const product = await service.create(USER, META, { sku: "NIM-LED-2001", name: "Nimbus LED Panel 2", category: "Lighting", unit: "pcs", price: 149, cost: 89, isStockItem: true, isSalesItem: true, isPurchaseItem: false });

      expect(mocks.client.create).toHaveBeenCalledWith("Item", expect.objectContaining({ item_code: "NIM-LED-2001", item_name: "Nimbus LED Panel 2", item_group: "Lighting", stock_uom: "pcs", standard_rate: 149, valuation_rate: 89 }));
      expect(product.code).toBe("NIM-LED-2001");
      expect(product.currency).toBe("USD");
      expect(product.status).toBe("active");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "product.create", resourceType: "Item", resourceId: "NIM-LED-2001", companyId: COMPANY, actorId: USER.id }),
      });
    });
  });

  describe("update", () => {
    it("patches mapped fields and audits", async () => {
      mocks.client.update.mockResolvedValue({ ...ITEM_DOCS[2], safety_stock: 15, disabled: 0 });

      const product = await service.update(USER, META, "MON-ARM-AR3", { reorderLevel: 15, status: "active" });

      expect(mocks.client.update).toHaveBeenCalledWith("Item", "MON-ARM-AR3", expect.objectContaining({ safety_stock: 15, disabled: 0 }));
      expect(product.reorderLevel).toBe(15);
      expect(product.status).toBe("active");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "product.update", resourceId: "MON-ARM-AR3" }),
      });
    });

    it("throws not_found when the item does not exist", async () => {
      mocks.client.update.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.update(USER, META, "NOPE", { name: "X" })).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });
  });

  describe("remove", () => {
    it("deletes the Item doc and audits", async () => {
      mocks.client.delete.mockResolvedValue(undefined);

      await service.remove(USER, META, "OLD-ITEM");

      expect(mocks.client.delete).toHaveBeenCalledWith("Item", "OLD-ITEM");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "product.delete", resourceType: "Item", resourceId: "OLD-ITEM" }),
      });
    });

    it("throws not_found for an unknown item", async () => {
      mocks.client.delete.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.remove(USER, META, "NOPE")).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });
  });
});
