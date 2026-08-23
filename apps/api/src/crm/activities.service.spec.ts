import { describe, expect, it } from "vitest";
import type { CrmRecordRepository } from "./crm-record.repository";
import { FakeCrmRecordRepository, TEST_META, TEST_USER } from "./crm-record.repository.spec-helper";
import { CrmNotificationsService } from "./notifications.service";
import { CrmActivitiesService } from "./activities.service";

describe("CrmActivitiesService ERP persistence", () => {
  it("persists comments, extracts mentions, and filters by reference", async () => {
    const fake = new FakeCrmRecordRepository();
    const notifications = new CrmNotificationsService(fake as unknown as CrmRecordRepository);
    const service = new CrmActivitiesService(fake as unknown as CrmRecordRepository, notifications);
    const activity = await service.createComment(TEST_USER, TEST_META, { referenceType: "deal", referenceCode: "DL-1", content: "Please review @Theo Lindqvist" });
    expect(activity.mentions).toEqual(["Theo Lindqvist"]);
    expect((await service.list(TEST_USER, TEST_META, { referenceType: "deal", referenceCode: "DL-1", limit: 50 })).total).toBe(1);
    expect((await notifications.list(TEST_USER, TEST_META, "true")).unreadCount).toBe(1);
  });
});
