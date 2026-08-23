import { describe, expect, it } from "vitest";
import type { CrmRecordRepository } from "./crm-record.repository";
import { FakeCrmRecordRepository, TEST_META, TEST_USER } from "./crm-record.repository.spec-helper";
import { CrmEmailTemplatesService } from "./email-templates.service";

describe("CrmEmailTemplatesService ERP persistence", () => {
  it("persists templates and renders previews", async () => {
    const service = new CrmEmailTemplatesService(new FakeCrmRecordRepository() as unknown as CrmRecordRepository);
    const template = await service.create(TEST_USER, TEST_META, { name: "Intro", subject: "Hello {{name}}", body: "Welcome to {{company}}" });
    expect(await service.preview(TEST_USER, TEST_META, { templateId: template.id, variables: { name: "Maya", company: "Acme" } })).toEqual({ subject: "Hello Maya", body: "Welcome to Acme" });
    expect((await service.list(TEST_USER, TEST_META)).items).toHaveLength(1);
  });
});
