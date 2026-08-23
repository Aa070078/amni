import { describe, expect, it } from "vitest";
import type { CrmRecordRepository } from "./crm-record.repository";
import { FakeCrmRecordRepository, TEST_META, TEST_USER } from "./crm-record.repository.spec-helper";
import { CrmCallLogsService } from "./call-logs.service";

describe("CrmCallLogsService ERP persistence", () => {
  it("persists, summarizes, updates, and deletes calls", async () => {
    const service = new CrmCallLogsService(new FakeCrmRecordRepository() as unknown as CrmRecordRepository);
    const call = await service.create(TEST_USER, TEST_META, { direction: "outbound", status: "ringing", phoneNumber: "+20100" });
    expect((await service.list(TEST_USER, TEST_META, { page: 1, pageSize: 20 })).summary.outgoing).toBe(1);
    expect((await service.update(TEST_USER, TEST_META, call.id, { status: "completed", durationSeconds: 60 })).durationSeconds).toBe(60);
    await service.remove(TEST_USER, TEST_META, call.id);
    await expect(service.detail(TEST_USER, TEST_META, call.id)).rejects.toMatchObject({ status: 404 });
  });
});
