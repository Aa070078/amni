import { describe, expect, it } from "vitest";
import type { CrmRecordRepository } from "./crm-record.repository";
import { FakeCrmRecordRepository, TEST_META, TEST_USER } from "./crm-record.repository.spec-helper";
import { CrmNotificationsService } from "./notifications.service";
import { CrmActivitiesService } from "./activities.service";
import { CrmEventsService } from "./events.service";

describe("CrmEventsService ERP persistence", () => {
  it("persists linked events with reminders and activities", async () => {
    const records = new FakeCrmRecordRepository() as unknown as CrmRecordRepository;
    const notifications = new CrmNotificationsService(records);
    const activities = new CrmActivitiesService(records, notifications);
    const service = new CrmEventsService(records, activities, notifications);
    const event = await service.create(TEST_USER, TEST_META, { title: "Demo", startsAt: "2026-09-01T10:00:00.000Z", participants: [], referenceType: "deal", referenceCode: "DL-1", reminderBeforeMinutes: 15 });
    expect((await service.detail(TEST_USER, TEST_META, event.id)).title).toBe("Demo");
    expect((await notifications.list(TEST_USER, TEST_META, "true")).unreadCount).toBe(1);
    expect((await activities.list(TEST_USER, TEST_META, { referenceType: "deal", referenceCode: "DL-1", limit: 20 })).total).toBe(1);
  });
});
