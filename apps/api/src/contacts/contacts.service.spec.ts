import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@amni/shared";
import { ErpError } from "@amni/erp";
import type * as ErpModule from "@amni/erp";

import { ContactsService } from "./contacts.service";
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

const CONTACT_DOCS = [
  { name: "CON-0001", first_name: "Amira", last_name: "Haddad", email_id: "amira@democo.io", mobile_no: "+20 2 456 1100", designation: "Chief Executive Officer", department: "Executive", company_name: "Demo Co", is_primary_contact: 1, creation: "2026-01-01 09:00:00", modified: "2026-06-01 09:00:00" },
  { name: "CON-0002", first_name: "Daniel", last_name: "Osei", email_id: "daniel.osei@democo.io", mobile_no: "+233 30 274 9901", designation: "Head of Sales", department: "Sales", company_name: "Demo Co", is_primary_contact: 1, creation: "2026-02-01 09:00:00", modified: "2026-06-02 09:00:00" },
  { name: "CON-0003", first_name: "Lena", last_name: "Fischer", email_id: "lena.fischer@democo.io", mobile_no: "+49 30 901 204", designation: "Operations Manager", department: "Operations", company_name: "Demo Co", is_primary_contact: 1, creation: "2026-03-01 09:00:00", modified: "2026-06-03 09:00:00" },
];

describe("ContactsService", () => {
  let service: ContactsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createErpClientForTenant.mockResolvedValue(mocks.client);
    mocks.auditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.membership.findFirst.mockResolvedValue({ companyId: COMPANY });
    service = new ContactsService(new ErpGatewayService());
  });

  describe("list", () => {
    it("returns contacts from the tenant site mapped to the contract, sorted by createdAt desc", async () => {
      mocks.client.list.mockResolvedValue({ items: CONTACT_DOCS, hasMore: false });

      const result = await service.list(USER, META, { page: 1, pageSize: 20 });

      expect(result.meta.total).toBe(3);
      expect(result.items[0].code).toBe("CON-0003");
      expect(result.items[0].firstName).toBe("Lena");
      expect(result.items[0].company).toBe("Demo Co");
      expect(result.items[0].status).toBe("active");
    });

    it("maps ERPNext fields and reports active status for every contact", async () => {
      mocks.client.list.mockResolvedValue({ items: CONTACT_DOCS, hasMore: false });

      const result = await service.list(USER, META, { page: 1, pageSize: 20 });

      expect(result.items[0].email).toBe("lena.fischer@democo.io");
      expect(result.items[0].phone).toBe("+49 30 901 204");
      expect(result.items[0].jobTitle).toBe("Operations Manager");
      expect(result.items[0].department).toBe("Operations");
      expect(result.items[0].address).toBeUndefined();
      expect(result.items[0].notes).toBeUndefined();
    });

    it("filters by status (all contacts map to active)", async () => {
      mocks.client.list.mockResolvedValue({ items: CONTACT_DOCS, hasMore: false });

      const active = await service.list(USER, META, { page: 1, pageSize: 20, status: "active" });
      const inactive = await service.list(USER, META, { page: 1, pageSize: 20, status: "inactive" });

      expect(active.meta.total).toBe(3);
      expect(inactive.meta.total).toBe(0);
    });

    it("searches case-insensitively across name, title and company", async () => {
      mocks.client.list.mockResolvedValue({ items: CONTACT_DOCS, hasMore: false });

      const result = await service.list(USER, META, { page: 1, pageSize: 20, q: "SALES" });

      expect(result.meta.total).toBe(1);
      expect(result.items[0].code).toBe("CON-0002");
    });

    it("sorts by lastName ascending when requested", async () => {
      mocks.client.list.mockResolvedValue({ items: CONTACT_DOCS, hasMore: false });

      const result = await service.list(USER, META, { page: 1, pageSize: 20, sortBy: "lastName", sortDir: "asc" });

      expect(result.items.map((c) => c.code)).toEqual(["CON-0003", "CON-0001", "CON-0002"]);
    });

    it("paginates", async () => {
      mocks.client.list.mockResolvedValue({ items: CONTACT_DOCS, hasMore: false });

      const page1 = await service.list(USER, META, { page: 1, pageSize: 2 });
      const page2 = await service.list(USER, META, { page: 2, pageSize: 2 });

      expect(page1.items.length).toBe(2);
      expect(page2.items.length).toBe(1);
      expect(page2.items[0].code).not.toBe(page1.items[0].code);
    });
  });

  describe("detail", () => {
    it("returns the mapped contact", async () => {
      mocks.client.get.mockResolvedValue(CONTACT_DOCS[0]);

      const detail = await service.detail(USER, META, "CON-0001");

      expect(detail.code).toBe("CON-0001");
      expect(detail.firstName).toBe("Amira");
      expect(detail.lastName).toBe("Haddad");
      expect(detail.status).toBe("active");
      expect(mocks.client.get).toHaveBeenCalledWith("Contact", "CON-0001");
    });

    it("throws not_found for an unknown contact", async () => {
      mocks.client.get.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.detail(USER, META, "CON-9999")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("create", () => {
    it("creates the Contact doc on the tenant site and audits", async () => {
      mocks.client.create.mockResolvedValue({
        name: "CON-0011",
        first_name: "Tariq",
        last_name: "Ali",
        mobile_no: "+20 1 234 5678",
        is_primary_contact: 1,
      });

      const contact = await service.create(USER, META, {
        firstName: "Tariq",
        lastName: "Ali",
        phone: "+20 1 234 5678",
        company: "Acme Ltd",
      });

      expect(mocks.client.create).toHaveBeenCalledWith(
        "Contact",
        expect.objectContaining({ first_name: "Tariq", last_name: "Ali", mobile_no: "+20 1 234 5678", company_name: "Acme Ltd", is_primary_contact: 1 }),
      );
      expect(contact.code).toBe("CON-0011");
      expect(contact.firstName).toBe("Tariq");
      expect(contact.phone).toBe("+20 1 234 5678");
      expect(contact.status).toBe("active");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "contact.create", resourceType: "Contact", resourceId: "CON-0011", companyId: COMPANY, actorId: USER.id }),
      });
    });
  });

  describe("update", () => {
    it("patches mapped fields and audits", async () => {
      mocks.client.update.mockResolvedValue({ ...CONTACT_DOCS[1], first_name: "Daniel", designation: "VP Sales" });

      const contact = await service.update(USER, META, "CON-0002", { firstName: "Daniel", jobTitle: "VP Sales" });

      expect(mocks.client.update).toHaveBeenCalledWith(
        "Contact",
        "CON-0002",
        expect.objectContaining({ first_name: "Daniel", designation: "VP Sales" }),
      );
      expect(contact.firstName).toBe("Daniel");
      expect(contact.jobTitle).toBe("VP Sales");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "contact.update", resourceId: "CON-0002" }),
      });
    });

    it("throws not_found when the contact does not exist", async () => {
      mocks.client.update.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.update(USER, META, "CON-9999", { firstName: "X" })).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });

  describe("remove", () => {
    it("deletes the Contact doc and audits", async () => {
      mocks.client.delete.mockResolvedValue(undefined);

      await service.remove(USER, META, "CON-0012");

      expect(mocks.client.delete).toHaveBeenCalledWith("Contact", "CON-0012");
      expect(mocks.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "contact.delete", resourceType: "Contact", resourceId: "CON-0012" }),
      });
    });

    it("throws not_found for an unknown contact", async () => {
      mocks.client.delete.mockRejectedValue(new ErpError(ErrorCode.ERP_NOT_FOUND, "Not Found", { status: 404 }));

      await expect(service.remove(USER, META, "CON-9999")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });
  });
});
