import { Injectable } from "@nestjs/common";
import type { CreateCrmEventInput, CrmEvent, CrmEventListQuery, CrmEventListResponse, UpdateCrmEventInput } from "@amni/shared";
import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
import { newId } from "./crm-common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmActivitiesService } from "./activities.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmNotificationsService } from "./notifications.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmRecordRepository } from "./crm-record.repository";

@Injectable()
export class CrmEventsService {
  constructor(private readonly records: CrmRecordRepository, private readonly activities: CrmActivitiesService, private readonly notifications: CrmNotificationsService) {}
  async list(user: GatewayUser, meta: GatewayRequestMeta, query: CrmEventListQuery): Promise<CrmEventListResponse> {
    const items = (await this.records.list<CrmEvent>(user, meta, "event", { filters: { category: query.type, reference_type: query.referenceType, reference_code: query.referenceCode }, orderBy: "event_at asc", pageLength: 100 })).items.filter((event) => (!query.from || event.startsAt >= query.from) && (!query.to || event.startsAt <= query.to));
    return { items };
  }
  detail(user: GatewayUser, meta: GatewayRequestMeta, id: string): Promise<CrmEvent> { return this.records.get(user, meta, "event", id); }
  async create(user: GatewayUser, meta: GatewayRequestMeta, input: CreateCrmEventInput): Promise<CrmEvent> {
    const event: CrmEvent = { id: newId("evt"), title: input.title, type: input.type ?? "other", startsAt: input.startsAt, endsAt: input.endsAt, description: input.description, participants: input.participants, referenceType: input.referenceType, referenceCode: input.referenceCode, reminderBeforeMinutes: input.reminderBeforeMinutes ?? null, createdAt: new Date().toISOString() };
    const created = await this.records.create(user, meta, "event", event.id, event, indexesFor(event));
    if (created.reminderBeforeMinutes && created.reminderBeforeMinutes > 0) await this.notifications.add(user, meta, { type: "info", title: `Reminder: ${created.title}`, body: `${created.reminderBeforeMinutes} minutes before the event.` });
    if (created.referenceType && created.referenceCode) await this.activities.push(user, meta, "event", created.referenceType, created.referenceCode, `Scheduled: ${created.title}`, user.email);
    return created;
  }
  async update(user: GatewayUser, meta: GatewayRequestMeta, id: string, input: UpdateCrmEventInput): Promise<CrmEvent> { const event = { ...(await this.detail(user, meta, id)), ...input, id }; return this.records.update(user, meta, "event", id, event, indexesFor(event)); }
  remove(user: GatewayUser, meta: GatewayRequestMeta, id: string): Promise<void> { return this.records.remove(user, meta, "event", id); }
}
function indexesFor(event: CrmEvent) { return { title: event.title, category: event.type, referenceType: event.referenceType, referenceCode: event.referenceCode, eventAt: event.startsAt, searchText: [event.title, event.description, ...event.participants.map((participant) => `${participant.name} ${participant.email}`)].filter(Boolean).join(" ") }; }
