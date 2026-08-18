import { Injectable } from "@nestjs/common";
import type { CreateCrmViewInput, CrmView, CrmViewListQuery, CrmViewListResponse, UpdateCrmViewInput } from "@amni/shared";

import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
import { newId } from "./crm-common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmRecordRepository } from "./crm-record.repository";

@Injectable()
export class CrmViewsService {
  constructor(private readonly records: CrmRecordRepository) {}
  async list(user: GatewayUser, meta: GatewayRequestMeta, query: CrmViewListQuery): Promise<CrmViewListResponse> { return { items: (await this.records.list<CrmView>(user, meta, "view", { filters: { category: query.doctype }, orderBy: "creation desc", pageLength: 100 })).items }; }
  detail(user: GatewayUser, meta: GatewayRequestMeta, id: string): Promise<CrmView> { return this.records.get(user, meta, "view", id); }
  async create(user: GatewayUser, meta: GatewayRequestMeta, input: CreateCrmViewInput): Promise<CrmView> {
    const view: CrmView = { id: newId("view"), doctype: input.doctype, type: input.type ?? "list", name: input.name, filters: input.filters, sortBy: input.sortBy, sortDir: input.sortDir ?? "asc", groupBy: input.groupBy, isDefault: input.isDefault ?? false, pinned: input.pinned ?? false, public: input.public ?? false, createdAt: new Date().toISOString() };
    if (view.isDefault) await this.clearDefault(user, meta, view.doctype, view.type);
    return this.records.create(user, meta, "view", view.id, view, indexesFor(view));
  }
  async update(user: GatewayUser, meta: GatewayRequestMeta, id: string, input: UpdateCrmViewInput): Promise<CrmView> {
    const view: CrmView = { ...(await this.detail(user, meta, id)), ...input, id };
    if (input.isDefault) await this.clearDefault(user, meta, view.doctype, view.type, id);
    return this.records.update(user, meta, "view", id, view, indexesFor(view));
  }
  remove(user: GatewayUser, meta: GatewayRequestMeta, id: string): Promise<void> { return this.records.remove(user, meta, "view", id); }
  private async clearDefault(user: GatewayUser, meta: GatewayRequestMeta, doctype: string, type: string, exceptId?: string): Promise<void> {
    const views = (await this.records.list<CrmView>(user, meta, "view", { filters: { category: doctype }, pageLength: 100 })).items;
    await Promise.all(views.filter((view) => view.id !== exceptId && view.type === type && view.isDefault).map((view) => this.records.update(user, meta, "view", view.id, { ...view, isDefault: false }, indexesFor({ ...view, isDefault: false }))));
  }
}
function indexesFor(view: CrmView) { return { title: view.name, status: view.type, category: view.doctype, stateGroup: view.public ? "public" : "private", searchText: view.name }; }
