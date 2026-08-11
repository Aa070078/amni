import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateCrmEventInput,
  type CrmEvent,
  type CrmEventListQuery,
  type CrmEventListResponse,
  type UpdateCrmEventInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import { iso, newId } from "./crm-common";
import { type CrmActivitiesService } from "./activities.service";
import { type CrmNotificationsService } from "./notifications.service";

const at = (dayOffset: number, hour: number, minute = 0): string => {
  const date = new Date(Date.now() + dayOffset * 86_400_000);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const SEED: CrmEvent[] = [
  { id: "evt-1", title: "Meridian PO follow-up", type: "call", startsAt: at(0, 10, 30), endsAt: at(0, 11), description: "Chase final PO from the facilities team.", participants: [{ name: "Amara Osei", email: "amara@amni.app" }, { name: "Sarah Whitfield", email: "sarah@meridianlegal.com" }], referenceType: "deal", referenceCode: "DL-0001", reminderBeforeMinutes: 30, createdAt: iso(3) },
  { id: "evt-2", title: "Northwind shelving walkthrough", type: "meeting", startsAt: at(1, 14), endsAt: at(1, 15, 30), description: "Review load ratings per aisle before finalising the quote.", participants: [{ name: "Theo Lindqvist", email: "theo@amni.app" }, { name: "Jonas Weber", email: "jonas@northwind-traders.de" }], referenceType: "deal", referenceCode: "DL-0003", reminderBeforeMinutes: 60, createdAt: iso(2) },
  { id: "evt-3", title: "Aster pilot kickoff call", type: "call", startsAt: at(2, 16), description: "Confirm pilot store location and demo dates.", participants: [{ name: "Theo Lindqvist", email: "theo@amni.app" }], referenceType: "deal", referenceCode: "DL-0006", reminderBeforeMinutes: 15, createdAt: iso(2) },
  { id: "evt-4", title: "Fjord margin split confirmation", type: "follow_up", startsAt: at(4, 9), description: "Confirm margin split in writing with Nordic Design Partners.", participants: [{ name: "Theo Lindqvist", email: "theo@amni.app" }], referenceType: "deal", referenceCode: "DL-0009", reminderBeforeMinutes: 0, createdAt: iso(4) },
  { id: "evt-5", title: "Vantage renewal terms review", type: "meeting", startsAt: at(6, 11), endsAt: at(6, 12), description: "Prior-year terms plus two extra seats; confirm headcount.", participants: [{ name: "Amara Osei", email: "amara@amni.app" }, { name: "Lena Fischer", email: "lena@vantagehealthcare.com" }], referenceType: "deal", referenceCode: "DL-0008", reminderBeforeMinutes: 120, createdAt: iso(5) },
  { id: "evt-6", title: "Summit View fabric decision", type: "follow_up", startsAt: at(8, 15), description: "Fabric swatch decision window closes.", participants: [{ name: "Amara Osei", email: "amara@amni.app" }], referenceType: "deal", referenceCode: "DL-0005", reminderBeforeMinutes: 0, createdAt: iso(6) },
];

@Injectable()
export class CrmEventsService {
  private records: CrmEvent[] = structuredClone(SEED);

  constructor(
    private readonly activities: CrmActivitiesService,
    private readonly notifications: CrmNotificationsService,
  ) {}

  list(query: CrmEventListQuery): CrmEventListResponse {
    let items = this.records;
    if (query.type) items = items.filter((event) => event.type === query.type);
    if (query.referenceType) items = items.filter((event) => event.referenceType === query.referenceType);
    if (query.referenceCode) items = items.filter((event) => event.referenceCode === query.referenceCode);
    if (query.from) items = items.filter((event) => event.startsAt >= query.from!);
    if (query.to) items = items.filter((event) => event.startsAt <= query.to!);
    return { items: [...items].sort((a, b) => (a.startsAt > b.startsAt ? 1 : -1)) };
  }

  detail(id: string): CrmEvent {
    return this.find(id);
  }

  create(input: CreateCrmEventInput): CrmEvent {
    const event: CrmEvent = {
      id: newId("evt"),
      title: input.title,
      type: input.type ?? "other",
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      description: input.description,
      participants: input.participants,
      referenceType: input.referenceType,
      referenceCode: input.referenceCode,
      reminderBeforeMinutes: input.reminderBeforeMinutes ?? null,
      createdAt: new Date().toISOString(),
    };
    this.records.push(event);
    this.notifyReminder(event);
    if (event.referenceType && event.referenceCode) {
      this.activities.push("event", event.referenceType, event.referenceCode, `Scheduled: ${event.title}`, "System");
    }
    return event;
  }

  update(id: string, input: UpdateCrmEventInput): CrmEvent {
    const event = this.find(id);
    if (input.title !== undefined) event.title = input.title;
    if (input.type !== undefined) event.type = input.type;
    if (input.startsAt !== undefined) event.startsAt = input.startsAt;
    if (input.endsAt !== undefined) event.endsAt = input.endsAt;
    if (input.description !== undefined) event.description = input.description;
    if (input.participants !== undefined) event.participants = input.participants;
    if (input.referenceType !== undefined) event.referenceType = input.referenceType;
    if (input.referenceCode !== undefined) event.referenceCode = input.referenceCode;
    if (input.reminderBeforeMinutes !== undefined) event.reminderBeforeMinutes = input.reminderBeforeMinutes;
    return event;
  }

  remove(id: string): void {
    const index = this.records.findIndex((record) => record.id === id);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Event ${id} not found` });
    }
    this.records.splice(index, 1);
  }

  private find(id: string): CrmEvent {
    const event = this.records.find((record) => record.id === id);
    if (!event) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Event ${id} not found` });
    }
    return event;
  }

  private notifyReminder(event: CrmEvent): void {
    if (!event.reminderBeforeMinutes || event.reminderBeforeMinutes <= 0) return;
    this.notifications.add({
      type: "info",
      title: `Reminder: ${event.title}`,
      body: `${event.reminderBeforeMinutes} minutes before the event.`,
    });
  }
}
