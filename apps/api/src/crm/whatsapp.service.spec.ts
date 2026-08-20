import { describe, expect, it } from "vitest";
import type { CrmRecordRepository } from "./crm-record.repository";
import { FakeCrmRecordRepository, TEST_META, TEST_USER } from "./crm-record.repository.spec-helper";
import { CrmNotificationsService } from "./notifications.service";
import { CrmActivitiesService } from "./activities.service";
import { CrmWhatsappService } from "./whatsapp.service";

describe("CrmWhatsappService ERP persistence", () => {
  it("persists message history and linked activity", async () => {
    const fake = new FakeCrmRecordRepository();
    const activities = new CrmActivitiesService(fake as unknown as CrmRecordRepository, new CrmNotificationsService(fake as unknown as CrmRecordRepository));
    const service = new CrmWhatsappService(fake as unknown as CrmRecordRepository, activities);
    await service.send(TEST_USER, TEST_META, { to: "+20100", message: "Hello", referenceType: "deal", referenceCode: "DL-1" });
    expect((await service.history(TEST_USER, TEST_META, { referenceType: "deal", referenceCode: "DL-1", limit: 20 })).items).toHaveLength(1);
    expect((await activities.list(TEST_USER, TEST_META, { referenceType: "deal", referenceCode: "DL-1", limit: 20 })).total).toBe(1);
  });
});
