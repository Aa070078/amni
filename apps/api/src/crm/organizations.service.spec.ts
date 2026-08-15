import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@amni/shared";
import type * as ErpModule from "@amni/erp";

import { CrmOrganizationsService } from "./organizations.service";
import { CrmContactsService } from "./contacts.service";
import { DealsService } from "../deals/deals.service";
import { ErpGatewayService, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";
import { ApiException } from "../common/api.exception";

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

const DEAL_DOCS = [
  { name: "DL-0001", title: "Mission district office fit-out", customer_name: "Serenity Interiors", contact_display: "Maya Chen", status: "Replied", opportunity_amount: 96400, currency: "USD", creation: "2026-07-11 09:00:00", modified: "2026-08-12 09:00:00" },
  { name: "DL-0004", title: "Enterprise support tier, two offices", customer_name: "Serenity Interiors", contact_display: "Sarah Whitfield", status: "Converted", opportunity_amount: 37800, currency: "USD", creation: "2026-06-19 09:00:00", modified: "2026-08-06 09:00:00" },
];

describe("CrmOrganizationsService", () => {
  const createService = () =>
    new CrmOrganizationsService(new CrmContactsService(), new DealsService(new ErpGatewayService()));

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createErpClientForTenant.mockResolvedValue(mocks.client);
    mocks.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.membership.findFirst.mockResolvedValue({ companyId: COMPANY });
    mocks.client.list.mockResolvedValue({ items: DEAL_DOCS, hasMore: false });
  });

  describe("list", () => {
    it("reports aggregate stats over all records", async () => {
      const result = await createService().list(USER, META, { page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(10);
      expect(result.stats.total).toBe(10);
      expect(result.stats.active).toBeGreaterThan(0);
      expect(result.stats.leads).toBeGreaterThan(0);
    });

    it("aggregates open deal value from the ERP-backed deals surface", async () => {
      const result = await createService().list(USER, META, { page: 1, pageSize: 20 });

      expect(result.stats.openDealValue).toBe(96400);
      expect(mocks.client.list).toHaveBeenCalled();
    });

    it("filters by status", async () => {
      const result = await createService().list(USER, META, { page: 1, pageSize: 20, status: "inactive" });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].code).toBe("ORG-0009");
    });

    it("searches by name and industry", async () => {
      const result = await createService().list(USER, META, { page: 1, pageSize: 20, q: "healthcare" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("ORG-0010");
    });
  });

  describe("detail", () => {
    it("includes contact and deal counts", async () => {
      const org = await createService().detail(USER, META, "ORG-0001");

      expect(org.contactCount).toBeGreaterThanOrEqual(1);
      expect(org.dealCount).toBe(2);
      expect(org.openDealValue).toBe(96400);
    });

    it("throws NOT_FOUND for an unknown code", async () => {
      await expect(createService().detail(USER, META, "ORG-9999")).rejects.toMatchObject({
        status: 404,
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("create", () => {
    it("allocates the next code and defaults status to lead", () => {
      const org = createService().create({ name: "Halcyon Group" });

      expect(org.code).toBe("ORG-0011");
      expect(org.status).toBe("lead");
    });
  });

  describe("update", () => {
    it("updates provided fields only", () => {
      const service = createService();
      const updated = service.update("ORG-0001", { territory: "global" });

      expect(updated.territory).toBe("global");
      expect(updated.name).toBe("Serenity Interiors");
    });
  });

  describe("remove", () => {
    it("removes a known org and throws for an unknown one", async () => {
      const service = createService();
      service.remove("ORG-0010");

      expect((await service.list(USER, META, { page: 1, pageSize: 20 })).meta.total).toBe(9);
      expect(() => service.remove("ORG-0010")).toThrow(ApiException);
    });
  });
});
