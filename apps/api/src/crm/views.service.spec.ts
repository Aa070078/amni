import { describe, expect, it } from "vitest";
import type { CrmRecordRepository } from "./crm-record.repository";
import { FakeCrmRecordRepository, TEST_META, TEST_USER } from "./crm-record.repository.spec-helper";
import { CrmViewsService } from "./views.service";

describe("CrmViewsService ERP persistence", () => {
  it("persists views and enforces a single default per type", async () => {
    const service = new CrmViewsService(new FakeCrmRecordRepository() as unknown as CrmRecordRepository);
    const first = await service.create(TEST_USER, TEST_META, { doctype: "deal", name: "First", filters: [], isDefault: true });
    const second = await service.create(TEST_USER, TEST_META, { doctype: "deal", name: "Second", filters: [], isDefault: true });
    expect((await service.detail(TEST_USER, TEST_META, first.id)).isDefault).toBe(false);
    expect((await service.detail(TEST_USER, TEST_META, second.id)).isDefault).toBe(true);
    expect((await service.list(TEST_USER, TEST_META, { doctype: "deal" })).items).toHaveLength(2);
  });
});
