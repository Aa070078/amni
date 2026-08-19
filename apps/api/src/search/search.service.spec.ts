import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductRole } from "@amni/shared";

import { SearchService } from "./search.service";
import type { ErpGatewayService, GatewayUser } from "../erp-gateway/erp-gateway.service";

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@amni/db", () => ({ prisma: { membership: { findMany: mocks.findMany } } }));

describe("SearchService", () => {
  const call = vi.fn();
  const gateway = { scopeFor: vi.fn(async () => ({ companyId: "company-1", client: { call } })) } as unknown as ErpGatewayService;
  const meta = { requestId: "req-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
    call.mockImplementation(async (_method: string, args: { doctype: string }) => args.doctype === "Customer"
      ? { results: [{ value: "CUS-0001", description: "Serenity Interiors" }] }
      : { results: [] });
  });

  it("searches the membership-resolved ERP and groups bounded results", async () => {
    const user: GatewayUser = { id: "user-1", email: "owner@acme.test", role: ProductRole.ADMIN };
    const result = await new SearchService(gateway).global(user, meta, { q: "serenity" });
    expect(result.query).toBe("serenity");
    expect(result.groups.find((group) => group.label === "Customers")?.results[0]).toMatchObject({ title: "CUS-0001", type: "customer" });
    expect(call).toHaveBeenCalledWith("frappe.desk.search.search_link", expect.objectContaining({ txt: "serenity", page_length: 5 }));
  });

  it("never searches doctypes outside the specialist role", async () => {
    const user: GatewayUser = { id: "sales-1", email: "sales@acme.test", role: ProductRole.SALES };
    await new SearchService(gateway).global(user, meta, { q: "serenity" });
    const doctypes = call.mock.calls.map((entry) => (entry[1] as { doctype: string }).doctype);
    expect(doctypes).toContain("Customer");
    expect(doctypes).not.toContain("Supplier");
    expect(doctypes).not.toContain("Payment Entry");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("adds only tenant-scoped team matches for administrators", async () => {
    mocks.findMany.mockResolvedValue([{ id: "membership-1", productRole: "SALES", user: { firstName: "Sam", lastName: "Saleh", email: "sam@acme.test" } }]);
    const user: GatewayUser = { id: "user-1", email: "owner@acme.test", role: ProductRole.ADMIN };
    const result = await new SearchService(gateway).global(user, meta, { q: "sam" });
    expect(result.groups.find((group) => group.label === "Team")?.results[0]?.title).toBe("Sam Saleh");
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: "company-1" }), take: 5 }));
  });
});
