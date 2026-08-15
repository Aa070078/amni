import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateCrmNoteInput,
  type CrmNote,
  type CrmNoteListQuery,
  type CrmNoteListResponse,
  type UpdateCrmNoteInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import { iso, nextCode, paginate, sortRecords } from "./crm-common";

const SORT_WHITELIST = new Set(["title", "pinned", "author", "createdAt", "updatedAt"]);

const SEED: CrmNote[] = [
  { code: "NTE-0001", title: "Serenity discovery call notes", content: "Facilities team loves the fit-out package. Decision by facilities director, PO through procurement. Key concern: timeline around the Marina Blvd lease renewal.", pinned: true, author: "Amara Osei", referenceType: "deal", referenceCode: "DL-0001", createdAt: iso(20), updatedAt: iso(2) },
  { code: "NTE-0002", title: "Pricing guardrails", content: "Do not discount below 15% margin without a VP sign-off. Volume discounts over 40% need contract review.", pinned: true, author: "Theo Lindqvist", createdAt: iso(45), updatedAt: iso(10) },
  { code: "NTE-0003", title: "Summit View lobby constraints", content: "Bespoke lobby pieces add ~40% to the package. Comparing three fabric swatch suppliers; lead times range 4–7 weeks.", pinned: false, author: "Amara Osei", referenceType: "deal", referenceCode: "DL-0005", createdAt: iso(18), updatedAt: iso(3) },
  { code: "NTE-0004", title: "Trade show follow-ups", content: "Follow up with every booth scan within 72 hours. Prioritise decision-makers flagged in the CRM.", pinned: false, author: "Theo Lindqvist", createdAt: iso(30), updatedAt: iso(30) },
  { code: "NTE-0005", title: "Fjord margin split terms", content: "Margin split agreed verbally with Nordic Design Partners — 60/40. Confirm in writing before closing.", pinned: false, author: "Theo Lindqvist", referenceType: "deal", referenceCode: "DL-0009", createdAt: iso(12), updatedAt: iso(4) },
  { code: "NTE-0006", title: "Aster pilot logistics", content: "Pilot across one store first. National rollout conditional on pilot clearing 20% attachment rate.", pinned: false, author: "Theo Lindqvist", referenceType: "deal", referenceCode: "DL-0006", createdAt: iso(9), updatedAt: iso(9) },
];

@Injectable()
export class CrmNotesService {
  private records: CrmNote[] = structuredClone(SEED);

  list(query: CrmNoteListQuery): CrmNoteListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((note) => {
      if (query.referenceType && note.referenceType !== query.referenceType) return false;
      if (query.referenceCode && note.referenceCode !== query.referenceCode) return false;
      if (query.pinned === "true" && !note.pinned) return false;
      if (query.pinned === "false" && note.pinned) return false;
      if (!q) return true;
      return [note.title, note.content, note.author ?? ""].join(" ").toLowerCase().includes(q);
    });

    const sorted = sortRecords(filtered, query.sortBy, query.sortDir ?? "asc", SORT_WHITELIST);
    const { items, total } = paginate(sorted, query.page, query.pageSize);
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  listForReference(referenceType: string, referenceCode: string): CrmNote[] {
    return this.records.filter((note) => note.referenceType === referenceType && note.referenceCode === referenceCode);
  }

  detail(code: string): CrmNote {
    return this.find(code);
  }

  create(input: CreateCrmNoteInput): CrmNote {
    const note: CrmNote = {
      code: nextCode(this.records, "NTE"),
      title: input.title,
      content: input.content,
      pinned: input.pinned ?? false,
      author: input.author,
      referenceType: input.referenceType,
      referenceCode: input.referenceCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.records.unshift(note);
    return note;
  }

  update(code: string, input: UpdateCrmNoteInput): CrmNote {
    const note = this.find(code);
    if (input.title !== undefined) note.title = input.title;
    if (input.content !== undefined) note.content = input.content;
    if (input.pinned !== undefined) note.pinned = input.pinned;
    if (input.author !== undefined) note.author = input.author;
    if (input.referenceType !== undefined) note.referenceType = input.referenceType;
    if (input.referenceCode !== undefined) note.referenceCode = input.referenceCode;
    note.updatedAt = new Date().toISOString();
    return note;
  }

  remove(code: string): void {
    const index = this.records.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Note ${code} not found` });
    }
    this.records.splice(index, 1);
  }

  private find(code: string): CrmNote {
    const note = this.records.find((record) => record.code === code);
    if (!note) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Note ${code} not found` });
    }
    return note;
  }
}
