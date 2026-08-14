import { Injectable } from "@nestjs/common";
import {
  type CrmWhatsappHistoryQuery,
  type CrmWhatsappHistoryResponse,
  type CrmWhatsappMessage,
  type CrmWhatsappResponse,
  type SendCrmWhatsappInput,
} from "@amni/shared";

import { newId } from "./crm-common";
import { type CrmActivitiesService } from "./activities.service";

const SEED: CrmWhatsappMessage[] = [
  { id: "wa-1", to: "+49 30 1234 5678", message: "Hi Jonas — sending over the load rating request now.", status: "sent", referenceType: "deal", referenceCode: "DL-0003", sentAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
  { id: "wa-2", to: "+1 415-555-0142", message: "Maya, confirming our call tomorrow at 10:30. Amara.", status: "sent", referenceType: "deal", referenceCode: "DL-0001", sentAt: new Date(Date.now() - 86_400_000).toISOString() },
];

@Injectable()
export class CrmWhatsappService {
  private records: CrmWhatsappMessage[] = structuredClone(SEED);

  constructor(private readonly activities: CrmActivitiesService) {}

  send(input: SendCrmWhatsappInput): CrmWhatsappResponse {
    const message: CrmWhatsappMessage = {
      id: newId("wa"),
      to: input.to,
      message: input.message,
      status: "sent",
      referenceType: input.referenceType,
      referenceCode: input.referenceCode,
      sentAt: new Date().toISOString(),
    };
    this.records.unshift(message);
    if (input.referenceType && input.referenceCode) {
      this.activities.push(
        "whatsapp",
        input.referenceType,
        input.referenceCode,
        `Sent WhatsApp to ${input.to}: ${input.message}`,
        "Amara Osei",
      );
    }
    return { message };
  }

  history(query: CrmWhatsappHistoryQuery): CrmWhatsappHistoryResponse {
    let items = this.records;
    if (query.referenceType) items = items.filter((message) => message.referenceType === query.referenceType);
    if (query.referenceCode) items = items.filter((message) => message.referenceCode === query.referenceCode);
    return { items: items.slice(0, query.limit) };
  }
}
