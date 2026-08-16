import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@amni/shared";
import { ErpError } from "@amni/erp";
import type * as ErpModule from "@amni/erp";

import { WarehousesService } from "./warehouses.service";
import { ErpGatewayService, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";

const mocks = vi.hoisted(() => {
  const client = {
    list: vi.fn(),
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

const WAREHOUSE_DOCS = [
  { name: "Main Store - ACME", warehouse_name: "Main Store", disabled: 0, creation: "2026-01-01 09:00:00", modified: "2026-06-01 09:00:00" },
  { name: "Workshop - ACME", warehouse_name: "Workshop", disabled: 0, creation: "2026-02-01 09:00:00", modified: "2026-06-02 09:00:00" },
  { name: "Returns - ACME", warehouse_name: "Returns Center", disabled: 1, creation: "2026-03-01 09:00:00", modified: "2026-06-03 09:00:00" },
];

const BIN_DOCS = [
  { name: "BIN-1", item_code: "PRD-0001", warehouse: "Main Store - ACME", actual_qty: 24, reserved_qty: 3, projected_qty: 21 },
  { name: "BIN-2", item_code: "PRD-0003", warehouse: "Main Store - ACME", actual_qty: 2, reserved_qty: 0, projected_qty: 2 },
];

function mockWarehouseList() {
  mocks.client.list.mockImplementation(async (doctype: string) => {
    if (doctype === "Warehouse") return { items: WAREHOUSE_DOCS, hasMore: false };
    return { items: [], hasMore: false };
  });
}

describe("WarehousesService", () => {
  let service: WarehousesService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createErpClientForTenant.mockResolvedValue(mocks.client);
    mocks.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.membership.findFirst.mockResolvedValue({ companyId: COMPANY });
    service = new WarehousesService(new ErpGatewayService());
  });

  describe("list", () => {
    it("returns warehouses from the tenant site mapped to the contract", async () => {
      mockWarehouseList();

      const result = await service.list(USER, META, { page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(3);
      expect(result.items[0].code).toBe("Returns - ACME");
      expect(result.items[0].status).toBe("inactive");
      expect(result.items[2].name).toBe("Main Store");
    });

    it("filters by status", async () => {
      mockWarehouseList();

      const result = await service.list(USER, META, { page: 1, pageSize: 20, status: "active" });

      expect(result.meta.total).toBe(2);
      expect(result.items.every((w) => w.status === "active")).toBe(true);
    });

    it("searches case-insensitively across name", async () => {
      mockWarehouseList();

      const result = await service.list(USER, META, { page: 1, pageSize: 20, q: "workshop" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("Workshop - ACME");
    });
  });

  describe("detail", () => {
    it("returns the warehouse with stock read from Bin docs", async () => {
      mocks.client.list.mockImplementation(async (doctype: string) => {
        if (doctype === "Bin") return { items: BIN_DOCS, hasMore: false };
        if (doctype === "Item") return { items: [{ name: "PRD-0001", safety_stock: 10 }, { name: "PRD-0003", safety_stock: 5 }], hasMore: false };
        return { items: [], hasMore: false };
      });
      mocks.client.get.mockResolvedValue(WAREHOUSE_DOCS[0]);

      const detail = await service.detail(USER, META, "Main Store - ACME");

      expect(detail.code).toBe("Main Store - ACME");
      expect(detail.stock).toHaveLength(2);
      expect(detail.stock[0]).toMatchObject({
        productCode: "PRD-0001",
        onHand: 24,
        reserved: 3,
        available: 21,
        reorderLevel: 10,
      });
      expect(detail.stock[1].reorderLevel).toBe(5);
      expect(detail.lowStock.map((row) => row.productCode)).toEqual(["PRD-0003"]);
      expect(mocks.client.list).toHaveBeenCalledWith(
        "Bin",
        expect.objectContaining({ filters: { warehouse: "Main Store - ACME" } }),
      );
    });

    it("throws not_found for an unknown warehouse", async () => {
      mocks.client.get.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.detail(USER, META, "NOPE")).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });
  });

  describe("stockSummary", () => {
    it("computes inventory value, warehouse count and low stock from Bin/Item/Warehouse docs", async () => {
      mocks.client.list.mockImplementation(async (doctype: string) => {
        if (doctype === "Bin") {
          return {
            items: [
              { name: "BIN-1", item_code: "PRD-0001", warehouse: "Main Store - ACME", actual_qty: 24, reserved_qty: 3, projected_qty: 21, valuation_rate: 10 },
              { name: "BIN-2", item_code: "PRD-0003", warehouse: "Main Store - ACME", actual_qty: 2, reserved_qty: 0, projected_qty: 2, valuation_rate: 50 },
            ],
            hasMore: false,
          };
        }
        if (doctype === "Item") {
          return {
            items: [
              { name: "PRD-0001", item_name: "Widget", safety_stock: 10 },
              { name: "PRD-0003", item_name: "Bolt", safety_stock: 5 },
            ],
            hasMore: false,
          };
        }
        if (doctype === "Warehouse") return { items: WAREHOUSE_DOCS, hasMore: false };
        return { items: [], hasMore: false };
      });

      const summary = await service.stockSummary(USER, META);

      expect(summary.value).toBe(340);
      expect(summary.warehouses).toBe(3);
      expect(summary.currency).toBe("USD");
      expect(summary.lowStockCount).toBe(1);
      expect(summary.lowStock).toEqual([{ code: "PRD-0003", name: "Bolt" }]);
      expect(mocks.client.list).toHaveBeenCalledWith(
        "Bin",
        expect.objectContaining({ fields: expect.arrayContaining(["valuation_rate"]) }),
      );
    });
  });

  describe("create", () => {
    it("creates the Warehouse doc on the tenant site and audits", async () => {
      mocks.client.create.mockResolvedValue({ ...WAREHOUSE_DOCS[0], name: "New Store - ACME" });

      const warehouse = await service.create(USER, META, { name: "New Store", status: "active" });

      expect(mocks.client.create).toHaveBeenCalledWith(
        "Warehouse",
        expect.objectContaining({ warehouse_name: "New Store", disabled: 0 }),
      );
      expect(warehouse.code).toBe("New Store - ACME");
      expect(warehouse.status).toBe("active");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "warehouse.create", resourceType: "Warehouse", resourceId: "New Store - ACME", companyId: COMPANY, actorId: USER.id }),
      });
    });
  });

  describe("update", () => {
    it("patches mapped fields and audits", async () => {
      mocks.client.update.mockResolvedValue({ ...WAREHOUSE_DOCS[2], disabled: 0 });

      const warehouse = await service.update(USER, META, "Returns - ACME", { status: "active" });

      expect(mocks.client.update).toHaveBeenCalledWith("Warehouse", "Returns - ACME", expect.objectContaining({ disabled: 0 }));
      expect(warehouse.status).toBe("active");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "warehouse.update", resourceId: "Returns - ACME" }),
      });
    });

    it("throws not_found when the warehouse does not exist", async () => {
      mocks.client.update.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.update(USER, META, "NOPE", { name: "X" })).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });
  });

  describe("remove", () => {
    it("deletes the Warehouse doc and audits", async () => {
      mocks.client.delete.mockResolvedValue(undefined);

      await service.remove(USER, META, "Old - ACME");

      expect(mocks.client.delete).toHaveBeenCalledWith("Warehouse", "Old - ACME");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "warehouse.delete", resourceType: "Warehouse", resourceId: "Old - ACME" }),
      });
    });

    it("throws not_found for an unknown warehouse", async () => {
      mocks.client.delete.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.remove(USER, META, "NOPE")).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });
  });
});
