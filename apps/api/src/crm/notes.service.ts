import { Injectable } from "@nestjs/common";
import type { CreateCrmNoteInput, CrmNote, CrmNoteListQuery, CrmNoteListResponse, UpdateCrmNoteInput } from "@amni/shared";

import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
import { newId } from "./crm-common";
// Value import required so TypeScript emits Nest constructor metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmRecordRepository } from "./crm-record.repository";

const SORT_FIELD: Record<string, string> = {
  title: "title",
  pinned: "category",
  author: "assigned_to",
  createdAt: "creation",
  updatedAt: "modified",
};

@Injectable()
export class CrmNotesService {
  constructor(private readonly records: CrmRecordRepository) {}

  async list(user: GatewayUser, meta: GatewayRequestMeta, query: CrmNoteListQuery): Promise<CrmNoteListResponse> {
    const { items, total } = await this.records.list<CrmNote>(user, meta, "note", {
      filters: {
        reference_type: query.referenceType,
        reference_code: query.referenceCode,
        category: query.pinned === undefined ? undefined : query.pinned === "true" ? "pinned" : "normal",
      },
      q: query.q,
      orderBy: `${SORT_FIELD[query.sortBy ?? "updatedAt"] ?? "modified"} ${query.sortDir ?? "desc"}`,
      start: (query.page - 1) * query.pageSize,
      pageLength: query.pageSize,
    });
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  async listForReference(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    referenceType: string,
    referenceCode: string,
  ): Promise<CrmNote[]> {
    return (
      await this.records.list<CrmNote>(user, meta, "note", {
        filters: { reference_type: referenceType, reference_code: referenceCode },
        pageLength: 100,
      })
    ).items;
  }

  detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<CrmNote> {
    return this.records.get<CrmNote>(user, meta, "note", code);
  }

  async create(user: GatewayUser, meta: GatewayRequestMeta, input: CreateCrmNoteInput): Promise<CrmNote> {
    const now = new Date().toISOString();
    const note: CrmNote = {
      ...input,
      code: newId("NTE"),
      pinned: input.pinned ?? false,
      createdAt: now,
      updatedAt: now,
    };
    return this.records.create(user, meta, "note", note.code, note, indexesFor(note));
  }

  async update(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    input: UpdateCrmNoteInput,
  ): Promise<CrmNote> {
    const current = await this.detail(user, meta, code);
    const note: CrmNote = { ...current, ...input, code, updatedAt: new Date().toISOString() };
    return this.records.update(user, meta, "note", code, note, indexesFor(note));
  }

  remove(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    return this.records.remove(user, meta, "note", code);
  }
}

function indexesFor(note: CrmNote) {
  return {
    title: note.title,
    category: note.pinned ? "pinned" : "normal",
    assignedTo: note.author,
    referenceType: note.referenceType,
    referenceCode: note.referenceCode,
    searchText: [note.title, note.content, note.author].filter(Boolean).join(" "),
  };
}
