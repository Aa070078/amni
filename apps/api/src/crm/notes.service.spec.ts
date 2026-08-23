import { describe, expect, it } from "vitest";
import type { CrmRecordRepository } from "./crm-record.repository";
import { FakeCrmRecordRepository, TEST_META, TEST_USER } from "./crm-record.repository.spec-helper";
import { CrmNotesService } from "./notes.service";

describe("CrmNotesService ERP persistence", () => {
  it("persists reference-scoped notes and mutations", async () => {
    const service = new CrmNotesService(new FakeCrmRecordRepository() as unknown as CrmRecordRepository);
    const note = await service.create(TEST_USER, TEST_META, { title: "Discovery", content: "Needs 20 seats", referenceType: "deal", referenceCode: "DL-1", pinned: true });
    expect(await service.listForReference(TEST_USER, TEST_META, "deal", "DL-1")).toHaveLength(1);
    expect((await service.update(TEST_USER, TEST_META, note.code, { pinned: false })).pinned).toBe(false);
    await service.remove(TEST_USER, TEST_META, note.code);
    await expect(service.detail(TEST_USER, TEST_META, note.code)).rejects.toMatchObject({ status: 404 });
  });
});
