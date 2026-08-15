import { Injectable } from "@nestjs/common";
import {
  type CreateCrmCommentInput,
  type CreateCrmStatusActivityInput,
  type CrmActivity,
  type CrmActivityKind,
  type CrmActivityListQuery,
  type CrmActivityListResponse,
} from "@amni/shared";

import { iso, newId } from "./crm-common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmNotificationsService } from "./notifications.service";

const SEED: CrmActivity[] = [
  { id: "act-seed-1", referenceType: "deal", referenceCode: "DL-0001", kind: "comment", content: "Facilities director confirmed interest in the full fit-out package.", author: "Amara Osei", mentions: [], attachments: [], createdAt: iso(6) },
  { id: "act-seed-2", referenceType: "deal", referenceCode: "DL-0001", kind: "call", content: "Discovery call with Maya Chen — walked through the Marina Blvd floor plan.", author: "Amara Osei", mentions: [], attachments: [], createdAt: iso(12) },
  { id: "act-seed-3", referenceType: "deal", referenceCode: "DL-0004", kind: "comment", content: "Contract signed. Onboarding scheduled for next Monday.", author: "Theo Lindqvist", mentions: [], attachments: [], createdAt: iso(8) },
  { id: "act-seed-4", referenceType: "deal", referenceCode: "DL-0004", kind: "status_change", content: "Stage changed to won", author: "Theo Lindqvist", mentions: [], attachments: [], createdAt: iso(8) },
  { id: "act-seed-5", referenceType: "lead", referenceCode: "LD-0001", kind: "comment", content: "Asked about timeline for the LED retrofit; expects to decide next quarter.", author: "Amara Osei", mentions: [], attachments: [], createdAt: iso(4) },
  { id: "act-seed-6", referenceType: "organization", referenceCode: "ORG-0001", kind: "system", content: "Organization created", author: "System", mentions: [], attachments: [], createdAt: iso(120) },
  { id: "act-seed-7", referenceType: "organization", referenceCode: "ORG-0002", kind: "comment", content: "Volume discount for the LED rollout locked in.", author: "Amara Osei", mentions: [], attachments: [], createdAt: iso(3) },
  { id: "act-seed-8", referenceType: "deal", referenceCode: "DL-0003", kind: "whatsapp", content: "Sent load-rating request to Jonas via WhatsApp.", author: "Theo Lindqvist", mentions: [], attachments: [], createdAt: iso(2) },
];

const MENTION_RE = /@([A-Z][A-Za-z'-]*(?: [A-Z][A-Za-z'-]*)*)/g;

@Injectable()
export class CrmActivitiesService {
  private records: CrmActivity[] = structuredClone(SEED);

  constructor(private readonly notifications: CrmNotificationsService) {}

  list(query: CrmActivityListQuery): CrmActivityListResponse {
    let items = this.records;
    if (query.referenceType) {
      items = items.filter((activity) => activity.referenceType === query.referenceType);
    }
    if (query.referenceCode) {
      items = items.filter((activity) => activity.referenceCode === query.referenceCode);
    }
    if (query.kind) {
      items = items.filter((activity) => activity.kind === query.kind);
    }
    const sorted = [...items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return { items: sorted.slice(0, query.limit), total: items.length };
  }

  createComment(input: CreateCrmCommentInput): CrmActivity {
    const mentions = input.mentions && input.mentions.length ? input.mentions : extractMentions(input.content);
    const activity = this.push("comment", input.referenceType, input.referenceCode, input.content, "Amara Osei", mentions, input.attachments);
    for (const mention of mentions) {
      this.notifications.add({
        type: "info",
        title: `${mention} mentioned you`,
        body: input.content.slice(0, 160),
        href: `/sales/crm/${input.referenceType === "deal" ? "deals" : input.referenceType === "lead" ? "leads" : "crm"}`,
      });
    }
    return activity;
  }

  createStatusActivity(input: CreateCrmStatusActivityInput): CrmActivity {
    const content = input.from && input.from !== input.to ? `${input.from} → ${input.to}` : `Stage changed to ${input.to}`;
    return this.push("status_change", input.referenceType, input.referenceCode, content, input.author ?? "Amara Osei");
  }

  push(
    kind: CrmActivityKind,
    referenceType: CrmActivity["referenceType"],
    referenceCode: string,
    content: string,
    author = "Amara Osei",
    mentions: string[] = [],
    attachments: CrmActivity["attachments"] = [],
  ): CrmActivity {
    const activity: CrmActivity = {
      id: newId("act"),
      referenceType,
      referenceCode,
      kind,
      content,
      author,
      mentions,
      attachments,
      createdAt: new Date().toISOString(),
    };
    this.records.unshift(activity);
    return activity;
  }
}

function extractMentions(content: string): string[] {
  const mentions = new Set<string>();
  for (const match of content.matchAll(MENTION_RE)) {
    const name = match[1];
    if (name) mentions.add(name.trim());
  }
  return Array.from(mentions);
}
