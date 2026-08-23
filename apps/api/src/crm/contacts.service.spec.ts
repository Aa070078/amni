import { describe, expect, it } from "vitest";
import type { CrmRecordRepository } from "./crm-record.repository";
import { FakeCrmRecordRepository, TEST_META, TEST_USER } from "./crm-record.repository.spec-helper";
import { CrmContactsService } from "./contacts.service";

describe("CrmContactsService ERP persistence", () => {
  it("creates, retrieves, filters, updates, and deletes a tenant contact", async () => {
    const fake = new FakeCrmRecordRepository();
    const service = new CrmContactsService(fake as unknown as CrmRecordRepository);
    const created = await service.create(TEST_USER, TEST_META, { firstName: "Maya", lastName: "Chen", email: "maya@example.com", organizationCode: "ORG-1" });
    expect((await service.detail(TEST_USER, TEST_META, created.code)).email).toBe("maya@example.com");
    expect((await service.list(TEST_USER, TEST_META, { page: 1, pageSize: 20, organizationCode: "ORG-1" })).meta.total).toBe(1);
    expect((await service.update(TEST_USER, TEST_META, created.code, { jobTitle: "Director" })).jobTitle).toBe("Director");
    await service.remove(TEST_USER, TEST_META, created.code);
    await expect(service.detail(TEST_USER, TEST_META, created.code)).rejects.toMatchObject({ status: 404 });
  });
});
