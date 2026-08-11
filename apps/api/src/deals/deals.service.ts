import { Injectable } from "@nestjs/common";
import {
  DEAL_STAGE_PROBABILITY,
  DEAL_STAGES,
  ErrorCode,
  type CreateDealInput,
  type Deal,
  type DealActivity,
  type DealDetail,
  type DealListQuery,
  type DealListResponse,
  type DealPipeline,
  type DealPipelineQuery,
  type DealStage,
  type MoveDealStageInput,
  type UpdateDealInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();
const dateOnly = (offsetDays: number): string =>
  new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);

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

type SeedDeal = Omit<Deal, "probability"> & { stage: DealStage };

const SEED: SeedDeal[] = [
  { code: "DL-0001", title: "Mission district office fit-out", company: "Serenity Interiors", contactName: "Maya Chen", contactEmail: "maya@serenityinteriors.com", contactPhone: "+1 415-555-0142", source: "referral", stage: "negotiation", value: 96_400, currency: "USD", expectedClose: dateOnly(12), owner: "Amara Osei", notes: "Proposal signed off on terms; awaiting final PO from the facilities team.", createdAt: iso(60), updatedAt: iso(1) },
  { code: "DL-0002", title: "LED rollout across retail locations", company: "Lumina Supplies", contactName: "Dario Beltran", contactEmail: "dario@luminasupplies.com", contactPhone: "+1 312-555-0198", source: "trade_show", stage: "proposal", value: 47_000, currency: "USD", expectedClose: dateOnly(24), owner: "Amara Osei", notes: "Three-store pilot priced; volume discount locked in.", createdAt: iso(45), updatedAt: iso(2) },
  { code: "DL-0003", title: "Warehouse shelving refresh", company: "Northwind Traders", contactName: "Jonas Weber", contactEmail: "jonas@northwind-traders.de", contactPhone: "+49 30 1234 5678", source: "cold_call", stage: "analysis", value: 16_800, currency: "USD", expectedClose: dateOnly(31), owner: "Theo Lindqvist", notes: "Walked through the two warehouses; needs load ratings per aisle.", createdAt: iso(33), updatedAt: iso(4) },
  { code: "DL-0004", title: "Enterprise support tier, two offices", company: "Meridian Legal", contactName: "Sarah Whitfield", contactEmail: "sarah@meridianlegal.com", contactPhone: "+1 202-555-0188", source: "referral", stage: "won", value: 37_800, currency: "USD", expectedClose: dateOnly(-8), owner: "Theo Lindqvist", notes: "Closed at list price. Onboarding scheduled next Monday.", createdAt: iso(70), updatedAt: iso(8) },
  { code: "DL-0005", title: "Lobby and suite furniture package", company: "Summit View Hotels", contactName: "Claire Beaumont", contactEmail: "claire@summitviewhotels.com", contactPhone: "+44 161 555 0190", source: "website", stage: "proposal", value: 77_200, currency: "USD", expectedClose: dateOnly(18), owner: "Amara Osei", notes: "Bespoke lobby pieces add 40%; comparing fabric swatches.", createdAt: iso(38), updatedAt: iso(1) },
  { code: "DL-0006", title: "Pilot store rollout", company: "Aster Retail Group", contactName: "Sofia Novak", contactEmail: "sofia@asterretail.com", contactPhone: "+1 646-555-0118", source: "referral", stage: "qualification", value: 88_000, currency: "USD", expectedClose: dateOnly(41), owner: "Theo Lindqvist", notes: "Pilot across one store first; national rollout if it clears.", createdAt: iso(20), updatedAt: iso(3) },
  { code: "DL-0007", title: "Implementation + training package", company: "Horizon Analytics", contactName: "Nadia Yusuf", contactEmail: "nadia@horizonanalytics.com", contactPhone: "+1 415-555-0171", source: "cold_call", stage: "won", value: 62_500, currency: "USD", expectedClose: dateOnly(-3), owner: "Amara Osei", notes: "Closed at list price. Implementation scheduled.", createdAt: iso(58), updatedAt: iso(3) },
  { code: "DL-0008", title: "Enterprise support tier renewal", company: "Vantage Healthcare", contactName: "Dr. Lena Fischer", contactEmail: "lena@vantagehealthcare.com", contactPhone: "+1 617-555-0163", source: "trade_show", stage: "analysis", value: 19_500, currency: "USD", expectedClose: dateOnly(21), owner: "Amara Osei", notes: "Renewal at prior-year terms plus two extra seats.", createdAt: iso(25), updatedAt: iso(2) },
  { code: "DL-0009", title: "Kitchen showroom partnership", company: "Fjord Kitchens", contactName: "Henrik Berg", contactEmail: "henrik@fjordkitchens.no", contactPhone: "+47 22 55 01 44", source: "partner", stage: "negotiation", value: 42_800, currency: "USD", expectedClose: dateOnly(15), owner: "Theo Lindqvist", notes: "Referred by Nordic Design Partners; margin split agreed.", createdAt: iso(50), updatedAt: iso(2) },
  { code: "DL-0010", title: "On-site install add-on", company: "Copperwood Co.", contactName: "Mateo Alvarez", contactEmail: "mateo@copperwoodco.com", contactPhone: "+1 602-555-0144", source: "email", stage: "lost", value: 16_700, currency: "USD", expectedClose: null, owner: "Amara Osei", notes: "Went with an incumbent vendor. Revisit next fiscal year.", createdAt: iso(55), updatedAt: iso(16) },
];

const toDeal = (seed: SeedDeal): Deal =>
  ({ ...seed, probability: DEAL_STAGE_PROBABILITY[seed.stage] }) as Deal;

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

function nextCode(records: Deal[]): string {
  const max = records.reduce((highest, deal) => {
    const number = Number(deal.code.slice(3));
    return number > highest ? number : highest;
  }, 0);
  return `DL-${String(max + 1).padStart(4, "0")}`;
}

/**
 * Reference data for the Demo Co tenant. This module is the only deals
 * surface until the ERP gateway lands (M5); endpoints then read from the
 * tenant ERPNext site and keep the same contract.
 */
@Injectable()
export class DealsService {
  private records: Deal[] = SEED.map(toDeal);

  pipeline(query: DealPipelineQuery): DealPipeline {
    const q = (query.q ?? "").toLowerCase().trim();
    const items = q
      ? this.records.filter((deal) =>
          [deal.title, deal.company, deal.contactName, deal.contactEmail, deal.contactPhone ?? "", deal.owner ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : this.records;

    const stats = DEAL_STAGES.map(({ value, label }) => {
      const stageDeals = items.filter((deal) => deal.stage === value);
      return {
        stage: value,
        label,
        count: stageDeals.length,
        value: stageDeals.reduce((sum, deal) => sum + deal.value, 0),
      };
    });

    return { stats, items };
  }

  list(query: DealListQuery): DealListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((deal) => {
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

    const page = query.page;
    const pageSize = query.pageSize;
    const start = (page - 1) * pageSize;
    return {
      items: sorted.slice(start, start + pageSize),
      meta: { total: sorted.length, page, pageSize },
    };
  }

  detail(code: string): DealDetail {
    const deal = this.records.find((record) => record.code === code);
    if (!deal) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Deal ${code} not found` });
    }
    return { ...deal, activities: activitiesFor(deal) };
  }

  create(input: CreateDealInput): Deal {
    const deal: Deal = {
      code: nextCode(this.records),
      title: input.title,
      company: input.company,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      source: input.source ?? "website",
      stage: input.stage ?? "qualification",
      value: input.value,
      currency: input.currency ?? "USD",
      probability: 0,
      expectedClose: input.expectedClose ?? null,
      owner: input.owner ?? "Amara Osei",
      notes: input.notes ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    deal.probability = DEAL_STAGE_PROBABILITY[deal.stage];
    this.records.push(deal);
    return deal;
  }

  update(code: string, input: UpdateDealInput): Deal {
    const deal = this.records.find((record) => record.code === code);
    if (!deal) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Deal ${code} not found` });
    }
    if (input.title !== undefined) deal.title = input.title;
    if (input.company !== undefined) deal.company = input.company;
    if (input.contactName !== undefined) deal.contactName = input.contactName;
    if (input.contactEmail !== undefined) deal.contactEmail = input.contactEmail;
    if (input.contactPhone !== undefined) deal.contactPhone = input.contactPhone;
    if (input.source !== undefined) deal.source = input.source;
    if (input.stage !== undefined) {
      deal.stage = input.stage;
      deal.probability = DEAL_STAGE_PROBABILITY[deal.stage];
    }
    if (input.value !== undefined) deal.value = input.value;
    if (input.currency !== undefined) deal.currency = input.currency;
    if (input.expectedClose !== undefined) deal.expectedClose = input.expectedClose;
    if (input.owner !== undefined) deal.owner = input.owner;
    if (input.notes !== undefined) deal.notes = input.notes;
    deal.updatedAt = new Date().toISOString();
    return deal;
  }

  moveStage(code: string, input: MoveDealStageInput): Deal {
    return this.update(code, { stage: input.stage });
  }

  remove(code: string): void {
    const index = this.records.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Deal ${code} not found` });
    }
    this.records.splice(index, 1);
  }
}
