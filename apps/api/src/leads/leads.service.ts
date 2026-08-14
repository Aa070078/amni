import { Injectable } from "@nestjs/common";
import {
  LEAD_STAGE_PROBABILITY,
  LEAD_STAGES,
  type CreateLeadInput,
  type Lead,
  type LeadActivity,
  type LeadDetail,
  type LeadListQuery,
  type LeadListResponse,
  type LeadPipeline,
  type LeadPipelineQuery,
  type LeadSource,
  type LeadStage,
  type MoveLeadStageInput,
  type UpdateLeadInput,
} from "@amni/shared";
import { LEAD_FIELDS, SALES_DOCTYPE, buildLeadDoc, type ErpLeadDoc } from "@amni/erp";

import { toIso } from "../common/frappe";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErpGatewayService } from "../erp-gateway/erp-gateway.service";
import { translateErpError, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";

const SORT_WHITELIST = new Set([
  "company",
  "contactName",
  "value",
  "expectedClose",
  "createdAt",
  "updatedAt",
  "stage",
]);

const STAGE_TO_ERP: Record<LeadStage, string> = {
  new: "Open",
  contacted: "Replied",
  qualified: "Qualified",
  proposal: "Opportunity",
  won: "Converted",
  lost: "Lost",
};

const ERP_TO_STAGE: Record<string, LeadStage> = {
  Open: "new",
  Replied: "contacted",
  Qualified: "qualified",
  Opportunity: "proposal",
  Converted: "won",
  Lost: "lost",
};

type ErpLeadRaw = ErpLeadDoc & { creation?: string; modified?: string; opportunity_amount?: number; currency?: string };

function stageFromErp(status?: string): LeadStage {
  return (status !== undefined && ERP_TO_STAGE[status]) || "new";
}

function toLead(doc: ErpLeadRaw): Lead {
  const stage = stageFromErp(doc.status);
  return {
    code: doc.name,
    company: doc.company_name ?? "",
    contactName: doc.lead_name ?? "",
    contactEmail: doc.email_id ?? "",
    contactPhone: doc.phone,
    source: (doc.source ?? "other") as LeadSource,
    stage,
    value: doc.opportunity_amount ?? 0,
    currency: doc.currency ?? "USD",
    probability: LEAD_STAGE_PROBABILITY[stage],
    expectedClose: doc.expected_close_date ?? null,
    owner: doc.lead_owner,
    notes: doc.notes ?? "",
    createdAt: toIso(doc.creation ?? doc.modified),
    updatedAt: toIso(doc.modified ?? doc.creation),
  };
}

function activitiesFor(lead: Lead): LeadActivity[] {
  const items: LeadActivity[] = [
    {
      id: `${lead.code}-created`,
      action: "Created lead",
      actor: lead.owner,
      time: lead.createdAt,
    },
  ];
  if (lead.stage === "contacted" || lead.stage === "qualified" || lead.stage === "proposal") {
    items.push({ id: `${lead.code}-contacted`, action: "Contacted", actor: lead.owner, time: lead.updatedAt });
  }
  if (lead.stage === "proposal" || lead.stage === "won") {
    items.push({ id: `${lead.code}-proposal`, action: "Sent proposal", actor: lead.owner, time: lead.updatedAt });
  }
  if (lead.stage === "won") {
    items.push({ id: `${lead.code}-won`, action: "Won deal", actor: lead.owner, time: lead.updatedAt });
  }
  if (lead.stage === "lost") {
    items.push({ id: `${lead.code}-lost`, action: "Marked lost", actor: lead.owner, time: lead.updatedAt });
  }
  return items.sort((a, b) => (a.time < b.time ? 1 : -1));
}

function sortValue(lead: Lead, sortBy: string): unknown {
  return lead[sortBy as keyof Lead];
}

/**
 * Leads backed by the tenant's real ERPNext Lead doctype. Platform stages map
 * to ERPNext statuses (new=Open .. won=Converted, lost=Lost). ERPNext stores
 * the source as a free-form string, so it is passed through as-is and only
 * defaults to "other" when absent; unknown statuses map back to "new".
 */
@Injectable()
export class LeadsService {
  constructor(private readonly gateway: ErpGatewayService) {}

  async pipeline(user: GatewayUser, meta: GatewayRequestMeta, query: LeadPipelineQuery): Promise<LeadPipeline> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const { items: docs } = await client.list<ErpLeadRaw>(SALES_DOCTYPE.lead, {
      limitPageLength: 0,
    });

    const q = (query.q ?? "").toLowerCase().trim();
    const records = q
      ? docs
          .map(toLead)
          .filter((lead) =>
            [lead.company, lead.contactName, lead.contactEmail, lead.contactPhone ?? "", lead.owner ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(q),
          )
      : docs.map(toLead);

    const stats = LEAD_STAGES.map(({ value, label }) => {
      const stageLeads = records.filter((lead) => lead.stage === value);
      return {
        stage: value,
        label,
        count: stageLeads.length,
        value: stageLeads.reduce((sum, lead) => sum + lead.value, 0),
      };
    });

    return { stats, items: records };
  }

  async list(user: GatewayUser, meta: GatewayRequestMeta, query: LeadListQuery): Promise<LeadListResponse> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const { items: docs } = await client.list<ErpLeadRaw>(SALES_DOCTYPE.lead, {
      limitPageLength: 0,
    });

    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = docs.map(toLead).filter((lead) => {
      if (query.stage && lead.stage !== query.stage) return false;
      if (!q) return true;
      return [lead.company, lead.contactName, lead.contactEmail, lead.contactPhone ?? "", lead.owner ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const sortBy = query.sortBy && SORT_WHITELIST.has(query.sortBy) ? query.sortBy : "createdAt";
    const sortDir = query.sortDir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const aValue = sortValue(a, sortBy);
      const bValue = sortValue(b, sortBy);
      if (aValue === bValue) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      return aValue < bValue ? -1 * sortDir : sortDir;
    });

    const start = (query.page - 1) * query.pageSize;
    return {
      items: sorted.slice(start, start + query.pageSize),
      meta: { total: sorted.length, page: query.page, pageSize: query.pageSize },
    };
  }

  async detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<LeadDetail> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const doc = await client
      .get<ErpLeadRaw>(SALES_DOCTYPE.lead, code)
      .catch((err) => translateErpError(err, "Lead"));
    const lead = toLead(doc);
    return { ...lead, activities: activitiesFor(lead) };
  }

  async create(user: GatewayUser, meta: GatewayRequestMeta, input: CreateLeadInput): Promise<Lead> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const created = await client.create<ErpLeadDoc>(SALES_DOCTYPE.lead, {
      ...buildLeadDoc({
        company: input.company,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        source: input.source,
        stage: STAGE_TO_ERP[input.stage ?? "new"],
        expectedClose: input.expectedClose,
        owner: input.owner,
        notes: input.notes,
      }),
      opportunity_amount: input.value,
      currency: input.currency ?? "USD",
    });
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "lead.create",
      resourceType: SALES_DOCTYPE.lead,
      resourceId: created.name,
    });
    return toLead(created);
  }

  async update(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    input: UpdateLeadInput,
  ): Promise<Lead> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const patch: Record<string, unknown> = {};
    if (input.company !== undefined) patch[LEAD_FIELDS.company] = input.company;
    if (input.contactName !== undefined) patch[LEAD_FIELDS.contactName] = input.contactName;
    if (input.contactEmail !== undefined) patch[LEAD_FIELDS.contactEmail] = input.contactEmail;
    if (input.contactPhone !== undefined) patch[LEAD_FIELDS.contactPhone] = input.contactPhone;
    if (input.source !== undefined) patch[LEAD_FIELDS.source] = input.source;
    if (input.stage !== undefined) patch[LEAD_FIELDS.stage] = STAGE_TO_ERP[input.stage];
    if (input.expectedClose !== undefined) patch[LEAD_FIELDS.expectedClose] = input.expectedClose;
    if (input.owner !== undefined) patch[LEAD_FIELDS.owner] = input.owner;
    if (input.notes !== undefined) patch[LEAD_FIELDS.notes] = input.notes;
    if (input.value !== undefined) patch.opportunity_amount = input.value;
    if (input.currency !== undefined) patch.currency = input.currency;

    const updated = await client
      .update<ErpLeadDoc>(SALES_DOCTYPE.lead, code, patch)
      .catch((err) => translateErpError(err, "Lead"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "lead.update",
      resourceType: SALES_DOCTYPE.lead,
      resourceId: code,
    });
    return toLead(updated);
  }

  async moveStage(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    input: MoveLeadStageInput,
  ): Promise<Lead> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const updated = await client
      .update<ErpLeadDoc>(SALES_DOCTYPE.lead, code, { [LEAD_FIELDS.stage]: STAGE_TO_ERP[input.stage] })
      .catch((err) => translateErpError(err, "Lead"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "lead.moveStage",
      resourceType: SALES_DOCTYPE.lead,
      resourceId: code,
    });
    return toLead(updated);
  }

  async remove(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    await client.delete(SALES_DOCTYPE.lead, code).catch((err) => translateErpError(err, "Lead"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "lead.delete",
      resourceType: SALES_DOCTYPE.lead,
      resourceId: code,
    });
  }
}
