import { describe, expect, it } from "vitest";
import type { CrmRecordRepository } from "./crm-record.repository";
import { FakeCrmRecordRepository, TEST_META, TEST_USER } from "./crm-record.repository.spec-helper";
import { CrmNotificationsService } from "./notifications.service";

describe("CrmNotificationsService ERP persistence", () => {
  it("keeps notifications user-scoped and supports read state", async () => {
    const service = new CrmNotificationsService(new FakeCrmRecordRepository() as unknown as CrmRecordRepository);
    const created = await service.add(TEST_USER, TEST_META, { type: "info", title: "Assigned" });
    expect((await service.list(TEST_USER, TEST_META, "true")).unreadCount).toBe(1);
    expect((await service.markRead(TEST_USER, TEST_META, created.id)).read).toBe(true);
    expect((await service.markAllRead(TEST_USER, TEST_META)).unreadCount).toBe(0);
  });
});
