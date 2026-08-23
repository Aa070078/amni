import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@amni/shared";
import { ErpError } from "@amni/erp";
import type * as ErpModule from "@amni/erp";

import { CustomersService } from "./customers.service";
import { ErpGatewayService, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";

const mocks = vi.hoisted(() => {
  const client = {
    list: vi.fn(),
    query: vi.fn(),
    call: vi.fn(),
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

const CUSTOMER_DOCS = [
  { name: "CUS-0001", customer_name: "Serenity Interiors", customer_type: "Company", customer_group: "Interior Fit-out", territory: "London", email_id: "a@serenity.io", default_currency: "GBP", disabled: 0, creation: "2026-01-01 09:00:00", modified: "2026-06-01 09:00:00" },
  { name: "CUS-0002", customer_name: "Lumina Supplies", customer_type: "Company", customer_group: "Lighting Distributor", territory: "Manchester", default_currency: "GBP", disabled: 0, creation: "2026-02-01 09:00:00", modified: "2026-06-02 09:00:00" },
  { name: "CUS-0003", customer_name: "Atlas Facilities", customer_type: "Company", customer_group: "Facilities Management", default_currency: "GBP", disabled: 1, creation: "2026-03-01 09:00:00", modified: "2026-06-03 09:00:00" },
];

function mockCustomerList(docs: object[]) {
  mocks.client.query.mockImplementation(async (_doctype: string, options: { filters?: Record<string, unknown>; q?: string; orderBy?: string; start?: number; pageLength?: number }) => {
    const source = docs as Array<Record<string, unknown>>;
    const q = (options.q ?? "").toLowerCase();
    const filtered = source.filter((doc) => Object.entries(options.filters ?? {}).every(([field, value]) => String(doc[field] ?? "") === String(value)))
      .filter((doc) => !q || Object.values(doc).some((value) => String(value ?? "").toLowerCase().includes(q)));
    const [field, direction] = (options.orderBy ?? "creation desc").split(" ");
    filtered.sort((a, b) => String(a[field ?? ""] ?? "").localeCompare(String(b[field ?? ""] ?? "")) * (direction === "asc" ? 1 : -1));
    const start = options.start ?? 0;
    return { items: filtered.slice(start, start + (options.pageLength ?? 20)), total: filtered.length };
  });
  mocks.client.call.mockResolvedValue({ items: [] });
}

describe("CustomersService", () => {
  let service: CustomersService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createErpClientForTenant.mockResolvedValue(mocks.client);
    mocks.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.membership.findFirst.mockResolvedValue({ companyId: COMPANY });
    service = new CustomersService(new ErpGatewayService());
  });

  describe("list", () => {
    it("returns customers from the tenant site mapped to the contract, sorted by createdAt desc", async () => {
      mockCustomerList(CUSTOMER_DOCS);

      const result = await service.list(USER, META, { page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(3);
      expect(result.items[0].code).toBe("CUS-0003");
      expect(result.items[0].status).toBe("inactive");
      expect(result.items[1].status).toBe("active");
      expect(result.items[0].type).toBe("company");
      expect(result.items[0].currency).toBe("GBP");
    });

    it("filters by status", async () => {
      mockCustomerList(CUSTOMER_DOCS);

      const result = await service.list(USER, META, { page: 1, pageSize: 20, status: "active" });

      expect(result.meta.total).toBe(2);
      expect(result.items.every((customer) => customer.status === "active")).toBe(true);
    });

    it("searches case-insensitively across name and group", async () => {
      mockCustomerList(CUSTOMER_DOCS);

      const result = await service.list(USER, META, { page: 1, pageSize: 20, q: "serenity" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("CUS-0001");
    });

    it("sorts by name ascending when requested", async () => {
      mockCustomerList(CUSTOMER_DOCS);

      const result = await service.list(USER, META, { page: 1, pageSize: 20, sortBy: "name", sortDir: "asc" });

      expect(result.items.map((c) => c.code)).toEqual(["CUS-0003", "CUS-0002", "CUS-0001"]);
    });

    it("paginates", async () => {
      mockCustomerList(CUSTOMER_DOCS);

      const page1 = await service.list(USER, META, { page: 1, pageSize: 2 });
      const page2 = await service.list(USER, META, { page: 2, pageSize: 2 });

      expect(page1.items.length).toBe(2);
      expect(page2.items.length).toBe(1);
      expect(page2.items[0].code).not.toBe(page1.items[0].code);
    });

    it("derives outstanding and totalSales from the tenant's sales invoices", async () => {
      mockCustomerList(CUSTOMER_DOCS);
      mocks.client.call.mockResolvedValue({ items: [{ customer: "CUS-0001", total_sales: 8000, outstanding: 1200 }] });

      const result = await service.list(USER, META, { page: 1, pageSize: 20 });
      const serenity = result.items.find((c) => c.code === "CUS-0001");

      expect(serenity?.totalSales).toBe(8000);
      expect(serenity?.outstanding).toBe(1200);
    });
  });

  describe("detail", () => {
    it("returns the mapped customer", async () => {
      mocks.client.call.mockResolvedValue({ items: [] });
      mocks.client.get.mockResolvedValue(CUSTOMER_DOCS[0]);

      const detail = await service.detail(USER, META, "CUS-0001");

      expect(detail.code).toBe("CUS-0001");
      expect(detail.name).toBe("Serenity Interiors");
      expect(detail.currency).toBe("GBP");
      expect(detail.status).toBe("active");
      expect(detail.type).toBe("company");
      expect(mocks.client.get).toHaveBeenCalledWith("Customer", "CUS-0001");
    });

    it("throws not_found for an unknown customer", async () => {
      mocks.client.call.mockResolvedValue({ items: [] });
      mocks.client.get.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.detail(USER, META, "CUS-9999")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("create", () => {
    it("creates the Customer doc on the tenant site and audits", async () => {
      mocks.client.create.mockResolvedValue({
        name: "CUS-0013",
        customer_name: "Test Client",
        customer_type: "Company",
        customer_group: "General",
        disabled: 0,
      });

      const customer = await service.create(USER, META, { name: "Test Client", group: "General" });

      expect(mocks.client.create).toHaveBeenCalledWith("Customer", expect.objectContaining({ customer_name: "Test Client", customer_group: "General", customer_type: "Company", disabled: 0 }));
      expect(customer.code).toBe("CUS-0013");
      expect(customer.type).toBe("company");
      expect(customer.group).toBe("General");
      expect(customer.status).toBe("active");
      expect(customer.currency).toBe("USD");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "customer.create", resourceType: "Customer", resourceId: "CUS-0013", companyId: COMPANY, actorId: USER.id }),
      });
    });

    it("honors explicit values in the built doc", async () => {
      mocks.client.create.mockResolvedValue({
        name: "CUS-0014",
        customer_name: "Acme Ltd",
        customer_type: "Company",
        customer_group: "Wholesale",
        default_currency: "EUR",
        payment_terms: "Net 60",
        disabled: 0,
      });

      const customer = await service.create(USER, META, {
        name: "Acme Ltd",
        type: "company",
        group: "Wholesale",
        currency: "EUR",
        status: "active",
        territory: "Paris",
        email: "billing@acme.example",
        paymentTerms: "Net 60",
      });

      expect(mocks.client.create).toHaveBeenCalledWith(
        "Customer",
        expect.objectContaining({ territory: "Paris", email_id: "billing@acme.example", payment_terms: "Net 60", default_currency: "EUR" }),
      );
      expect(customer.currency).toBe("EUR");
      expect(customer.paymentTerms).toBe("Net 60");
    });
  });

  describe("update", () => {
    it("patches mapped fields and audits", async () => {
      mocks.client.update.mockResolvedValue({ ...CUSTOMER_DOCS[2], customer_group: "Facilities", payment_terms: "30 days", disabled: 0 });

      const customer = await service.update(USER, META, "CUS-0003", { group: "Facilities", paymentTerms: "30 days", status: "active" });

      expect(mocks.client.update).toHaveBeenCalledWith(
        "Customer",
        "CUS-0003",
        expect.objectContaining({ customer_group: "Facilities", payment_terms: "30 days", disabled: 0 }),
      );
      expect(customer.group).toBe("Facilities");
      expect(customer.paymentTerms).toBe("30 days");
      expect(customer.status).toBe("active");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "customer.update", resourceId: "CUS-0003" }),
      });
    });

    it("throws not_found when the customer does not exist", async () => {
      mocks.client.update.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.update(USER, META, "CUS-9999", { name: "X" })).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("remove", () => {
    it("deletes the Customer doc and audits", async () => {
      mocks.client.delete.mockResolvedValue(undefined);

      await service.remove(USER, META, "CUS-0012");

      expect(mocks.client.delete).toHaveBeenCalledWith("Customer", "CUS-0012");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "customer.delete", resourceType: "Customer", resourceId: "CUS-0012" }),
      });
    });

    it("throws not_found for an unknown customer", async () => {
      mocks.client.delete.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.remove(USER, META, "CUS-9999")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });
});
