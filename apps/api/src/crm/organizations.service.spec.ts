import { describe, expect, it, vi } from "vitest";
import type { CrmRecordRepository } from "./crm-record.repository";
import { FakeCrmRecordRepository, TEST_META, TEST_USER } from "./crm-record.repository.spec-helper";
import { CrmOrganizationsService } from "./organizations.service";
import type { CrmContactsService } from "./contacts.service";
import type { DealsService } from "../deals/deals.service";

describe("CrmOrganizationsService ERP persistence", () => {
  it("persists organizations and enriches details with related counts", async () => {
    const records = new FakeCrmRecordRepository();
    const contacts = {
      listForOrganizations: vi.fn().mockResolvedValue([]),
      list: vi.fn().mockResolvedValue({ items: [], meta: { total: 0, page: 1, pageSize: 1 } }),
    } as unknown as CrmContactsService;
    const deals = { list: vi.fn().mockResolvedValue({ items: [], meta: { total: 0, page: 1, pageSize: 100 }, summary: { totalValue: 0, weightedValue: 0, openCount: 0, wonCount: 0, lostCount: 0 } }) } as unknown as DealsService;
    const service = new CrmOrganizationsService(records as unknown as CrmRecordRepository, contacts, deals);
    const organization = await service.create(TEST_USER, TEST_META, { name: "Acme", status: "active" });
    expect((await service.detail(TEST_USER, TEST_META, organization.code)).contactCount).toBe(0);
    expect((await service.list(TEST_USER, TEST_META, { page: 1, pageSize: 20, status: "active" })).meta.total).toBe(1);
    await service.remove(TEST_USER, TEST_META, organization.code);
    await expect(service.detail(TEST_USER, TEST_META, organization.code)).rejects.toMatchObject({ status: 404 });
  });
});
