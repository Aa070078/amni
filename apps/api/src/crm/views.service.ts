import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateCrmViewInput,
  type CrmView,
  type CrmViewListQuery,
  type CrmViewListResponse,
  type UpdateCrmViewInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import { iso, newId } from "./crm-common";

const SEED: CrmView[] = [
  { id: "view-1", doctype: "deal", type: "kanban", name: "Sales pipeline", filters: [], sortBy: "value", sortDir: "desc", groupBy: "stage", isDefault: true, pinned: true, public: true, createdAt: iso(90) },
  { id: "view-2", doctype: "deal", type: "list", name: "Won this quarter", filters: [{ field: "stage", operator: "equals", value: "won" }], sortBy: "value", sortDir: "desc", isDefault: false, pinned: true, public: true, createdAt: iso(80) },
  { id: "view-3", doctype: "deal", type: "list", name: "Closing this month", filters: [], sortBy: "expectedClose", sortDir: "asc", isDefault: false, pinned: true, public: false, createdAt: iso(70) },
  { id: "view-4", doctype: "lead", type: "kanban", name: "Lead pipeline", filters: [], groupBy: "stage", sortDir: "asc", isDefault: true, pinned: true, public: true, createdAt: iso(60) },
  { id: "view-5", doctype: "lead", type: "list", name: "All leads", filters: [], sortBy: "createdAt", sortDir: "desc", isDefault: false, pinned: false, public: true, createdAt: iso(50) },
  { id: "view-6", doctype: "task", type: "kanban", name: "Task board", filters: [], groupBy: "status", sortDir: "asc", isDefault: true, pinned: true, public: true, createdAt: iso(40) },
  { id: "view-7", doctype: "task", type: "list", name: "Due soon", filters: [], sortBy: "dueDate", sortDir: "asc", isDefault: false, pinned: true, public: false, createdAt: iso(30) },
  { id: "view-8", doctype: "organization", type: "list", name: "All organizations", filters: [], sortBy: "name", sortDir: "asc", isDefault: true, pinned: true, public: true, createdAt: iso(20) },
  { id: "view-9", doctype: "contact", type: "list", name: "All contacts", filters: [], sortBy: "firstName", sortDir: "asc", isDefault: true, pinned: true, public: true, createdAt: iso(10) },
];

@Injectable()
export class CrmViewsService {
  private records: CrmView[] = structuredClone(SEED);

  list(query: CrmViewListQuery): CrmViewListResponse {
    const items = query.doctype ? this.records.filter((view) => view.doctype === query.doctype) : this.records;
    return { items: [...items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)) };
  }

  detail(id: string): CrmView {
    const view = this.find(id);
    return view;
  }

  create(input: CreateCrmViewInput): CrmView {
    const view: CrmView = {
      id: newId("view"),
      doctype: input.doctype,
      type: input.type ?? "list",
      name: input.name,
      filters: input.filters,
      sortBy: input.sortBy,
      sortDir: input.sortDir ?? "asc",
      groupBy: input.groupBy,
      isDefault: input.isDefault ?? false,
      pinned: input.pinned ?? false,
      public: input.public ?? false,
      createdAt: new Date().toISOString(),
    };
    if (view.isDefault) this.clearDefault(view.doctype, view.type);
    this.records.push(view);
    return view;
  }

  update(id: string, input: UpdateCrmViewInput): CrmView {
    const view = this.find(id);
    if (input.doctype !== undefined) view.doctype = input.doctype;
    if (input.type !== undefined) view.type = input.type;
    if (input.name !== undefined) view.name = input.name;
    if (input.filters !== undefined) view.filters = input.filters;
    if (input.sortBy !== undefined) view.sortBy = input.sortBy;
    if (input.sortDir !== undefined) view.sortDir = input.sortDir;
    if (input.groupBy !== undefined) view.groupBy = input.groupBy;
    if (input.pinned !== undefined) view.pinned = input.pinned;
    if (input.public !== undefined) view.public = input.public;
    if (input.isDefault !== undefined) {
      if (input.isDefault) this.clearDefault(view.doctype, view.type);
      view.isDefault = input.isDefault;
    }
    return view;
  }

  remove(id: string): void {
    const index = this.records.findIndex((record) => record.id === id);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `View ${id} not found` });
    }
    this.records.splice(index, 1);
  }

  private find(id: string): CrmView {
    const view = this.records.find((record) => record.id === id);
    if (!view) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `View ${id} not found` });
    }
    return view;
  }

  private clearDefault(doctype: string, type: string): void {
    for (const view of this.records) {
      if (view.doctype === doctype && view.type === type && view.isDefault) {
        view.isDefault = false;
      }
    }
  }
}
