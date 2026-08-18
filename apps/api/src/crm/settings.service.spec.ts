import { describe, expect, it } from "vitest";
import type { CrmRecordRepository } from "./crm-record.repository";
import { FakeCrmRecordRepository, TEST_META, TEST_USER } from "./crm-record.repository.spec-helper";
import { CrmNotificationsService } from "./notifications.service";
import { CrmActivitiesService } from "./activities.service";
import { CrmCallLogsService } from "./call-logs.service";
import { CrmSettingsService } from "./settings.service";

describe("CrmSettingsService ERP persistence", () => {
  it("returns safe defaults, persists nested updates, and creates dial records", async () => {
    const records = new FakeCrmRecordRepository() as unknown as CrmRecordRepository;
    const calls = new CrmCallLogsService(records);
    const activities = new CrmActivitiesService(records, new CrmNotificationsService(records));
    const service = new CrmSettingsService(records, calls, activities);
    expect((await service.get(TEST_USER, TEST_META)).brandName).toBe("Amni CRM");
    expect((await service.update(TEST_USER, TEST_META, { brandName: "Acme", telephony: { enabled: true, provider: "twilio" } })).telephony.provider).toBe("twilio");
    expect((await service.dial(TEST_USER, TEST_META, { phoneNumber: "+20100" })).provider).toBe("twilio");
  });
});
