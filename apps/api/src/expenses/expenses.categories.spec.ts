import { describe, expect, it, vi } from "vitest";
import type { DomainRecordRepository } from "../common/domain-record.repository";
import type { ErpGatewayService, GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
import { ExpensesService } from "./expenses.service";

const user: GatewayUser = { id: "user-1", email: "accountant@example.com", role: "accountant" };
const meta: GatewayRequestMeta = { requestId: "req-1", ip: "127.0.0.1" };
const category = { code: "CAT-ABC1234567", name: "Travel", color: "blue", status: "active" as const, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" };

function service(records: Partial<DomainRecordRepository>): ExpensesService {
  return new ExpensesService({} as ErpGatewayService, records as DomainRecordRepository);
}

describe("ExpensesService category persistence", () => {
  it("lists only tenant records through the domain repository", async () => {
    const list = vi.fn(async () => ({ items: [category], total: 1 }));
    await expect(service({ list } as Partial<DomainRecordRepository>).listCategories(user, meta, { page: 1, pageSize: 20 })).resolves.toMatchObject({ items: [category], meta: { total: 1 } });
    expect(list).toHaveBeenCalledWith(user, meta, "expenses", "category", { pageLength: 200 });
  });

  it("creates collision-resistant records in tenant ERP storage", async () => {
    const create = vi.fn(async (_user, _meta, _domain, _type, _code, record) => record);
    const result = await service({ create } as Partial<DomainRecordRepository>).createCategory(user, meta, { name: "Software", color: "violet" });
    expect(result.code).toMatch(/^CAT-[A-Z0-9]{10}$/);
    expect(create).toHaveBeenCalledWith(user, meta, "expenses", "category", result.code, expect.objectContaining({ name: "Software" }), expect.objectContaining({ status: "active" }));
  });

  it("updates and deletes via the same tenant scope", async () => {
    const get = vi.fn(async () => category);
    const update = vi.fn(async (_user, _meta, _domain, _type, _code, record) => record);
    const remove = vi.fn(async () => undefined);
    const instance = service({ get, update, remove } as Partial<DomainRecordRepository>);
    await expect(instance.updateCategory(user, meta, category.code, { name: "Travel & lodging" })).resolves.toMatchObject({ name: "Travel & lodging" });
    await instance.removeCategory(user, meta, category.code);
    expect(remove).toHaveBeenCalledWith(user, meta, "expenses", "category", category.code);
  });
});
