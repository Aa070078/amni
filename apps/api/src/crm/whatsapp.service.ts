import { Injectable } from "@nestjs/common";
import type { CrmWhatsappHistoryQuery, CrmWhatsappHistoryResponse, CrmWhatsappMessage, CrmWhatsappResponse, SendCrmWhatsappInput } from "@amni/shared";
import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
import { newId } from "./crm-common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmActivitiesService } from "./activities.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmRecordRepository } from "./crm-record.repository";

@Injectable()
export class CrmWhatsappService {
  constructor(private readonly records: CrmRecordRepository, private readonly activities: CrmActivitiesService) {}
  async send(user: GatewayUser, meta: GatewayRequestMeta, input: SendCrmWhatsappInput): Promise<CrmWhatsappResponse> {
    const message: CrmWhatsappMessage = { id: newId("wa"), to: input.to, message: input.message, status: "sent", referenceType: input.referenceType, referenceCode: input.referenceCode, sentAt: new Date().toISOString() };
    const created = await this.records.create(user, meta, "whatsapp_message", message.id, message, indexesFor(message));
    if (created.referenceType && created.referenceCode) await this.activities.push(user, meta, "whatsapp", created.referenceType, created.referenceCode, `Sent WhatsApp to ${created.to}: ${created.message}`, user.email);
    return { message: created };
  }
  async history(user: GatewayUser, meta: GatewayRequestMeta, query: CrmWhatsappHistoryQuery): Promise<CrmWhatsappHistoryResponse> { return { items: (await this.records.list<CrmWhatsappMessage>(user, meta, "whatsapp_message", { filters: { reference_type: query.referenceType, reference_code: query.referenceCode }, orderBy: "event_at desc", pageLength: query.limit })).items }; }
}
function indexesFor(message: CrmWhatsappMessage) { return { title: message.to, status: message.status, referenceType: message.referenceType, referenceCode: message.referenceCode, eventAt: message.sentAt, searchText: `${message.to} ${message.message}` }; }
