import { describe, expect, it } from "vitest";
import type { CrmRecordRepository } from "./crm-record.repository";
import { FakeCrmRecordRepository, TEST_META, TEST_USER } from "./crm-record.repository.spec-helper";
import { CrmNotificationsService } from "./notifications.service";
import { CrmTasksService } from "./tasks.service";

describe("CrmTasksService ERP persistence", () => {
  it("persists tasks, open-state indexes, board state, and notifications", async () => {
    const fake = new FakeCrmRecordRepository();
    const notifications = new CrmNotificationsService(fake as unknown as CrmRecordRepository);
    const service = new CrmTasksService(fake as unknown as CrmRecordRepository, notifications);
    const task = await service.create(TEST_USER, TEST_META, { subject: "Send proposal", assignedTo: "Maya" });
    expect((await service.list(TEST_USER, TEST_META, { page: 1, pageSize: 20, open: "true" })).meta.total).toBe(1);
    expect((await service.board(TEST_USER, TEST_META, {})).columns.find((column) => column.status === "backlog")?.count).toBe(1);
    expect((await service.setStatus(TEST_USER, TEST_META, task.code, "done")).completedAt).toBeTruthy();
    expect((await notifications.list(TEST_USER, TEST_META, "true")).unreadCount).toBeGreaterThan(0);
  });
});
