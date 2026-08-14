import { Injectable } from "@nestjs/common";
import {
  DEAL_STAGE_PROBABILITY,
  DEAL_STAGES,
  type CreateDealInput,
  type Deal,
  type DealActivity,
  type DealDetail,
  type DealListQuery,
  type DealListResponse,
  type DealPipeline,
  type DealPipelineQuery,
  type DealSource,
  type DealStage,
  type MoveDealStageInput,
  type UpdateDealInput,
} from "@amni/shared";
import { OPPORTUNITY_DOCTYPE, OpportunityFields, buildOpportunityDoc, type ErpOpportunityDoc } from "@amni/erp";

import { toIso } from "../common/frappe";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErpGatewayService } from "../erp-gateway/erp-gateway.service";
import { translateErpError, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";

const SORT_WHITELIST = new Set([
  "title",
  "company",
  "contactName",
  "value",
  "expectedClose",
  "createdAt",
  "updatedAt",
  "stage",
]);

const STAGE_TO_ERP: Record<DealStage, string> = {
  qualification: "Open",
  analysis: "Replied",
  proposal: "Quotation",
  negotiation: "Quotation",
  won: "Converted",
  lost: "Lost",
};

const ERP_TO_STAGE: Record<string, DealStage> = {
  Open: "qualification",
  Replied: "analysis",
  Quotation: "proposal",
  Converted: "won",
  Lost: "lost",
};

type ErpOpportunityRaw = ErpOpportunityDoc & { creation?: string; modified?: string; opportunity_amount?: number; currency?: string };

function stageFromErp(status?: string): DealStage {
  return (status !== undefined && ERP_TO_STAGE[status]) || "qualification";
}

function toDeal(doc: ErpOpportunityRaw): Deal {
  const stage = stageFromErp(doc.status);
  return {
    code: doc.name,
    title: doc.title ?? "",
    company: doc.customer_name ?? doc.lead_name ?? doc.name,
    contactName: doc.contact_display ?? "",
    contactEmail: doc.contact_email ?? "",
    contactPhone: doc.contact_mobile,
    source: (doc.source ?? "other") as DealSource,
    stage,
    value: doc.opportunity_amount ?? 0,
    currency: doc.currency ?? "USD",
    probability: DEAL_STAGE_PROBABILITY[stage],
    expectedClose: doc.expected_closing ?? null,
    owner: doc.opportunity_owner,
    notes: doc.notes ?? "",
    createdAt: toIso(doc.creation ?? doc.modified),
    updatedAt: toIso(doc.modified ?? doc.creation),
  };
}

function activitiesFor(deal: Deal): DealActivity[] {
  const items: DealActivity[] = [
    {
      id: `${deal.code}-created`,
      action: "Created deal",
      actor: deal.owner,
      time: deal.createdAt,
    },
  ];
  if (deal.stage === "analysis" || deal.stage === "proposal" || deal.stage === "negotiation") {
    items.push({ id: `${deal.code}-analyzed`, action: "Started analysis", actor: deal.owner, time: deal.updatedAt });
  }
  if (deal.stage === "proposal" || deal.stage === "negotiation" || deal.stage === "won") {
    items.push({ id: `${deal.code}-proposal`, action: "Sent proposal", actor: deal.owner, time: deal.updatedAt });
  }
  if (deal.stage === "won") {
    items.push({ id: `${deal.code}-won`, action: "Won deal", actor: deal.owner, time: deal.updatedAt });
  }
  if (deal.stage === "lost") {
    items.push({ id: `${deal.code}-lost`, action: "Marked lost", actor: deal.owner, time: deal.updatedAt });
  }
  return items.sort((a, b) => (a.time < b.time ? 1 : -1));
}

/**
 * Deals backed by the tenant's real ERPNext Opportunity doctype. Platform
 * stages map to Opportunity statuses (qualification=Open, analysis=Replied,
 * proposal/negotiation=Quotation, won=Converted, lost=Lost); Opportunity has
 * no `Qualified`/`Opportunity` status, so both in-flight stages collapse onto
 * `Quotation`. Unknown statuses map back to "qualification".
 */
@Injectable()
export class DealsService {
  constructor(private readonly gateway: ErpGatewayService) {}

  async pipeline(user: GatewayUser, meta: GatewayRequestMeta, query: DealPipelineQuery): Promise<DealPipeline> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const { items: docs } = await client.list<ErpOpportunityRaw>(OPPORTUNITY_DOCTYPE, {
      limitPageLength: 0,
    });

    const q = (query.q ?? "").toLowerCase().trim();
    const records = q
      ? docs
          .map(toDeal)
          .filter((deal) =>
            [deal.title, deal.company, deal.contactName, deal.contactEmail, deal.contactPhone ?? "", deal.owner ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(q),
          )
      : docs.map(toDeal);

    const stats = DEAL_STAGES.map(({ value, label }) => {
      const stageDeals = records.filter((deal) => deal.stage === value);
      return {
        stage: value,
        label,
        count: stageDeals.length,
        value: stageDeals.reduce((sum, deal) => sum + deal.value, 0),
      };
    });

    return { stats, items: records };
  }

  async list(user: GatewayUser, meta: GatewayRequestMeta, query: DealListQuery): Promise<DealListResponse> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const { items: docs } = await client.list<ErpOpportunityRaw>(OPPORTUNITY_DOCTYPE, {
      limitPageLength: 0,
    });

    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = docs.map(toDeal).filter((deal) => {
      if (query.stage && deal.stage !== query.stage) return false;
      if (!q) return true;
      return [deal.title, deal.company, deal.contactName, deal.contactEmail, deal.contactPhone ?? "", deal.owner ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const sortBy = query.sortBy && SORT_WHITELIST.has(query.sortBy) ? query.sortBy : "createdAt";
    const sortDir = query.sortDir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortBy as keyof Deal];
      const bValue = b[sortBy as keyof Deal];
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

  async detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<DealDetail> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const doc = await client
      .get<ErpOpportunityRaw>(OPPORTUNITY_DOCTYPE, code)
      .catch((err) => translateErpError(err, "Deal"));
    const deal = toDeal(doc);
    return { ...deal, activities: activitiesFor(deal) };
  }

  async create(user: GatewayUser, meta: GatewayRequestMeta, input: CreateDealInput): Promise<Deal> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const created = await client.create<ErpOpportunityDoc>(OPPORTUNITY_DOCTYPE, {
      ...buildOpportunityDoc({
        title: input.title,
        company: input.company,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        source: input.source,
        stage: STAGE_TO_ERP[input.stage ?? "qualification"],
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
      action: "deal.create",
      resourceType: OPPORTUNITY_DOCTYPE,
      resourceId: created.name,
    });
    return toDeal(created);
  }

  async update(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    input: UpdateDealInput,
  ): Promise<Deal> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch[OpportunityFields.title] = input.title;
    if (input.company !== undefined) patch[OpportunityFields.company] = input.company;
    if (input.contactName !== undefined) patch[OpportunityFields.contactName] = input.contactName;
    if (input.contactEmail !== undefined) patch[OpportunityFields.contactEmail] = input.contactEmail;
    if (input.contactPhone !== undefined) patch[OpportunityFields.contactPhone] = input.contactPhone;
    if (input.source !== undefined) patch[OpportunityFields.source] = input.source;
    if (input.stage !== undefined) patch[OpportunityFields.stage] = STAGE_TO_ERP[input.stage];
    if (input.expectedClose !== undefined) patch[OpportunityFields.expectedClose] = input.expectedClose;
    if (input.owner !== undefined) patch[OpportunityFields.owner] = input.owner;
    if (input.notes !== undefined) patch[OpportunityFields.notes] = input.notes;
    if (input.value !== undefined) patch.opportunity_amount = input.value;
    if (input.currency !== undefined) patch.currency = input.currency;

    const updated = await client
      .update<ErpOpportunityDoc>(OPPORTUNITY_DOCTYPE, code, patch)
      .catch((err) => translateErpError(err, "Deal"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "deal.update",
      resourceType: OPPORTUNITY_DOCTYPE,
      resourceId: code,
    });
    return toDeal(updated);
  }

  async moveStage(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    input: MoveDealStageInput,
  ): Promise<Deal> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const updated = await client
      .update<ErpOpportunityDoc>(OPPORTUNITY_DOCTYPE, code, {
        [OpportunityFields.stage]: STAGE_TO_ERP[input.stage],
      })
      .catch((err) => translateErpError(err, "Deal"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "deal.moveStage",
      resourceType: OPPORTUNITY_DOCTYPE,
      resourceId: code,
    });
    return toDeal(updated);
  }

  async remove(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    await client.delete(OPPORTUNITY_DOCTYPE, code).catch((err) => translateErpError(err, "Deal"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "deal.delete",
      resourceType: OPPORTUNITY_DOCTYPE,
      resourceId: code,
    });
  }
}
