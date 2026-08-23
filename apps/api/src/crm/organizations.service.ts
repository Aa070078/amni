import { Injectable } from "@nestjs/common";
import type {
  CreateOrganizationInput,
  Organization,
  OrganizationDetail,
  OrganizationListQuery,
  OrganizationListResponse,
  UpdateOrganizationInput,
} from "@amni/shared";

import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
// Value imports are required so TypeScript emits Nest constructor metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { DealsService } from "../deals/deals.service";
import { newId } from "./crm-common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmContactsService } from "./contacts.service";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmRecordRepository } from "./crm-record.repository";

const OPEN_DEAL_STAGES = new Set(["qualification", "analysis", "proposal", "negotiation"]);

const SORT_FIELD: Record<string, string> = {
  name: "title",
  industry: "category",
  territory: "category",
  status: "status",
  annualRevenue: "numeric_value",
  employeeCount: "numeric_value",
  createdAt: "creation",
  updatedAt: "modified",
};

@Injectable()
export class CrmOrganizationsService {
  constructor(
    private readonly records: CrmRecordRepository,
    private readonly contacts: CrmContactsService,
    private readonly deals: DealsService,
  ) {}

  async list(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    query: OrganizationListQuery,
  ): Promise<OrganizationListResponse> {
    const [{ items, total }, active, leads, contacts, deals] = await Promise.all([
      this.records.list<Organization>(user, meta, "organization", {
        filters: { status: query.status, category: query.industry },
        q: query.q,
        orderBy: `${SORT_FIELD[query.sortBy ?? "updatedAt"] ?? "modified"} ${query.sortDir ?? "desc"}`,
        start: (query.page - 1) * query.pageSize,
        pageLength: query.pageSize,
      }),
      this.records.list<Organization>(user, meta, "organization", { filters: { status: "active" }, pageLength: 1 }),
      this.records.list<Organization>(user, meta, "organization", { filters: { status: "lead" }, pageLength: 1 }),
      this.contacts.listForOrganizations(user, meta),
      this.deals.list(user, meta, { page: 1, pageSize: 100, sortDir: "asc" }),
    ]);
    const linkedCodes = new Set(contacts.map((contact) => contact.organizationCode).filter(Boolean));
    const openDealValue = deals.items
      .filter((deal) => OPEN_DEAL_STAGES.has(deal.stage))
      .reduce((sum, deal) => sum + deal.value, 0);
    return {
      items,
      meta: { total, page: query.page, pageSize: query.pageSize },
      stats: { total, active: active.total, leads: leads.total, contacts: linkedCodes.size, openDealValue },
    };
  }

  async detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<OrganizationDetail> {
    const org = await this.find(user, meta, code);
    const [contacts, deals] = await Promise.all([
      this.contacts.list(user, meta, { page: 1, pageSize: 1, organizationCode: code, sortDir: "asc" }),
      this.dealsFor(org.name, user, meta),
    ]);
    return {
      ...org,
      contactCount: contacts.meta.total,
      dealCount: deals.length,
      openDealValue: deals
        .filter((deal) => OPEN_DEAL_STAGES.has(deal.stage))
        .reduce((sum, deal) => sum + deal.value, 0),
    };
  }

  async create(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    input: CreateOrganizationInput,
  ): Promise<Organization> {
    const now = new Date().toISOString();
    const org: Organization = {
      ...input,
      code: newId("ORG"),
      status: input.status ?? "lead",
      createdAt: now,
      updatedAt: now,
    };
    return this.records.create(user, meta, "organization", org.code, org, indexesFor(org));
  }

  async update(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    input: UpdateOrganizationInput,
  ): Promise<Organization> {
    const current = await this.find(user, meta, code);
    const org: Organization = { ...current, ...input, code, updatedAt: new Date().toISOString() };
    return this.records.update(user, meta, "organization", code, org, indexesFor(org));
  }

  remove(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    return this.records.remove(user, meta, "organization", code);
  }

  private find(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<Organization> {
    return this.records.get<Organization>(user, meta, "organization", code);
  }

  private async dealsFor(name: string, user: GatewayUser, meta: GatewayRequestMeta) {
    const { items } = await this.deals.list(user, meta, { page: 1, pageSize: 100, q: name, sortDir: "asc" });
    return items;
  }
}

function indexesFor(org: Organization) {
  return {
    title: org.name,
    email: org.email,
    status: org.status,
    category: org.industry,
    assignedTo: org.owner,
    numericValue: org.annualRevenue,
    searchText: [org.name, org.website, org.email, org.industry, org.territory, org.owner].filter(Boolean).join(" "),
  };
}
