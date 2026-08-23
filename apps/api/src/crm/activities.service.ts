import { Injectable } from "@nestjs/common";
import type {
  CreateCrmCommentInput,
  CreateCrmStatusActivityInput,
  CrmActivity,
  CrmActivityKind,
  CrmActivityListQuery,
  CrmActivityListResponse,
} from "@amni/shared";

import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
import { newId } from "./crm-common";
// Value imports required so TypeScript emits Nest constructor metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmNotificationsService } from "./notifications.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmRecordRepository } from "./crm-record.repository";

const MENTION_RE = /@([A-Z][A-Za-z'-]*(?: [A-Z][A-Za-z'-]*)*)/g;

@Injectable()
export class CrmActivitiesService {
  constructor(
    private readonly records: CrmRecordRepository,
    private readonly notifications: CrmNotificationsService,
  ) {}

  async list(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    query: CrmActivityListQuery,
  ): Promise<CrmActivityListResponse> {
    const { items, total } = await this.records.list<CrmActivity>(user, meta, "activity", {
      filters: {
        category: query.kind,
        reference_type: query.referenceType,
        reference_code: query.referenceCode,
      },
      orderBy: "creation desc",
      pageLength: query.limit,
    });
    return { items, total };
  }

  async createComment(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    input: CreateCrmCommentInput,
  ): Promise<CrmActivity> {
    const mentions = input.mentions?.length ? input.mentions : extractMentions(input.content);
    const activity = await this.push(
      user,
      meta,
      "comment",
      input.referenceType,
      input.referenceCode,
      input.content,
      user.email,
      mentions,
      input.attachments,
    );
    await Promise.all(
      mentions.map((mention) =>
        this.notifications.add(user, meta, {
          type: "info",
          title: `${mention} mentioned you`,
          body: input.content.slice(0, 160),
          href: `/crm/${input.referenceType === "deal" ? "deals" : input.referenceType === "lead" ? "leads" : "organizations"}`,
        }),
      ),
    );
    return activity;
  }

  createStatusActivity(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    input: CreateCrmStatusActivityInput,
  ): Promise<CrmActivity> {
    const content = input.from && input.from !== input.to ? `${input.from} → ${input.to}` : `Stage changed to ${input.to}`;
    return this.push(
      user,
      meta,
      "status_change",
      input.referenceType,
      input.referenceCode,
      content,
      input.author ?? user.email,
    );
  }

  async push(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    kind: CrmActivityKind,
    referenceType: CrmActivity["referenceType"],
    referenceCode: string,
    content: string,
    author = user.email,
    mentions: string[] = [],
    attachments: CrmActivity["attachments"] = [],
  ): Promise<CrmActivity> {
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
    return this.records.create(user, meta, "activity", activity.id, activity, {
      title: content.slice(0, 140),
      category: kind,
      assignedTo: author,
      referenceType,
      referenceCode,
      eventAt: activity.createdAt,
      searchText: [content, author, ...mentions].join(" "),
    });
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
