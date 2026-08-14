import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ErpModule from "@amni/erp";

import { StockMovementsService } from "./stock-movements.service";
import { ErpGatewayService, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";

const mocks = vi.hoisted(() => {
  const client = {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    submit: vi.fn(),
    cancel: vi.fn(),
    delete: vi.fn(),
    call: vi.fn(),
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

const STOCK_ENTRY_DOCS = [
  {
    name: "MAT-REC-2026-00001",
    stock_entry_type: "Material Receipt",
    posting_date: "2026-06-01 09:00:00",
    purpose: "Initial stock received",
    owner: "Administrator",
    items: [{ item_code: "PRD-0001", item_name: "Ergonomic Office Chair", qty: 200, uom: "pcs", s_warehouse: null, t_warehouse: "WH-0001" }],
  },
  {
    name: "MAT-ISS-2026-00001",
    stock_entry_type: "Material Issue",
    posting_date: "2026-06-02 09:00:00",
    owner: "Administrator",
    items: [{ item_code: "PRD-0001", item_name: "Ergonomic Office Chair", qty: 24, uom: "pcs", s_warehouse: "WH-0001", t_warehouse: null }],
  },
  {
    name: "MAT-TRN-2026-00001",
    stock_entry_type: "Material Transfer",
    posting_date: "2026-06-03 09:00:00",
    owner: "Administrator",
    items: [{ item_code: "PRD-0003", item_name: "LED Desk Lamp", qty: 80, uom: "pcs", s_warehouse: "WH-0001", t_warehouse: "WH-0002" }],
  },
];

function mockStockEntryList() {
  mocks.client.list.mockImplementation(async (doctype: string) => {
    if (doctype === "Stock Entry") return { items: STOCK_ENTRY_DOCS, hasMore: false };
    return { items: [], hasMore: false };
  });
}

describe("StockMovementsService", () => {
  let service: StockMovementsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createErpClientForTenant.mockResolvedValue(mocks.client);
    mocks.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.membership.findFirst.mockResolvedValue({ companyId: COMPANY });
    service = new StockMovementsService(new ErpGatewayService());
  });

  describe("list", () => {
    it("returns stock entries mapped to the contract, sorted by date desc", async () => {
      mockStockEntryList();

      const result = await service.list(USER, META, { page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(3);
      expect(result.items[0].code).toBe("MAT-TRN-2026-00001");
      expect(result.items[0].type).toBe("transfer");
      expect(result.items[1].type).toBe("out");
      expect(result.items[2].type).toBe("in");
      expect(result.items[0]).toMatchObject({
        productCode: "PRD-0003",
        quantity: 80,
        fromWarehouse: "WH-0001",
        toWarehouse: "WH-0002",
        uom: "pcs",
      });
      expect(mocks.client.list).toHaveBeenCalledWith("Stock Entry", expect.objectContaining({ limitPageLength: 0 }));
    });

    it("filters by type and productCode", async () => {
      mockStockEntryList();

      const result = await service.list(USER, META, { page: 1, pageSize: 20, type: "transfer", productCode: "PRD-0003" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("MAT-TRN-2026-00001");
    });

    it("searches across product and warehouse", async () => {
      mockStockEntryList();

      const result = await service.list(USER, META, { page: 1, pageSize: 20, q: "office chair" });

      expect(result.meta.total).toBe(2);
    });
  });

  describe("create", () => {
    it("creates and submits the Stock Entry via executeStockMovement, then audits", async () => {
      mocks.client.create.mockResolvedValue({ name: "MAT-REC-2026-00002", stock_entry_type: "Material Receipt", docstatus: 0, items: [] });
      mocks.client.submit.mockResolvedValue({
        name: "MAT-REC-2026-00002",
        stock_entry_type: "Material Receipt",
        posting_date: "2026-06-10 09:00:00",
        purpose: "Cycle count variance",
        owner: "Administrator",
        items: [{ item_code: "PRD-0004", item_name: "Wireless Keyboard", qty: 5, uom: "pcs", s_warehouse: "WH-0002", t_warehouse: null }],
      });

      const movement = await service.create(USER, META, {
        type: "adjust",
        productCode: "PRD-0004",
        productName: "Wireless Keyboard",
        quantity: 5,
        fromWarehouse: "WH-0002",
        toWarehouse: null,
        reason: "Cycle count variance",
      });

      expect(mocks.client.create).toHaveBeenCalledWith("Stock Entry", expect.objectContaining({ stock_entry_type: "Material Receipt", items: [expect.objectContaining({ item_code: "PRD-0004", qty: 5, t_warehouse: "WH-0002" })] }));
      expect(mocks.client.submit).toHaveBeenCalledWith("Stock Entry", "MAT-REC-2026-00002");
      expect(movement).toMatchObject({
        code: "MAT-REC-2026-00002",
        type: "in",
        productCode: "PRD-0004",
        quantity: 5,
        fromWarehouse: "WH-0002",
      });
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "movement.create", resourceType: "Stock Entry", resourceId: "MAT-REC-2026-00002", companyId: COMPANY, actorId: USER.id }),
      });
    });
  });
});
