import { Injectable } from "@nestjs/common";
import {
  LEAD_STAGE_PROBABILITY,
  LEAD_STAGES,
  ErrorCode,
  type CreateLeadInput,
  type Lead,
  type LeadActivity,
  type LeadDetail,
  type LeadListQuery,
  type LeadListResponse,
  type LeadPipeline,
  type LeadPipelineQuery,
  type LeadStage,
  type MoveLeadStageInput,
  type UpdateLeadInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();
const dateOnly = (offsetDays: number): string =>
  new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);

const SORT_WHITELIST = new Set([
  "company",
  "contactName",
  "value",
  "expectedClose",
  "createdAt",
  "updatedAt",
  "stage",
]);

type SeedLead = Omit<Lead, "probability"> & { stage: LeadStage };

const SEED: SeedLead[] = [
  { code: "LD-0001", company: "Serenity Interiors", contactName: "Maya Chen", contactEmail: "maya@serenityinteriors.com", contactPhone: "+1 415-555-0142", source: "referral", stage: "proposal", value: 48_200, currency: "USD", expectedClose: dateOnly(21), owner: "Amara Osei", notes: "Full office fit-out for the Mission district studio. Proposal sent with volume discount.", createdAt: iso(34), updatedAt: iso(2) },
  { code: "LD-0002", company: "Lumina Supplies", contactName: "Dario Beltran", contactEmail: "dario@luminasupplies.com", contactPhone: "+1 312-555-0198", source: "trade_show", stage: "qualified", value: 23_500, currency: "USD", expectedClose: dateOnly(45), owner: "Amara Osei", notes: "Met at LED Expo. Needs lighting order for three retail locations.", createdAt: iso(28), updatedAt: iso(4) },
  { code: "LD-0003", company: "Atlas Facilities", contactName: "Priya Raman", contactEmail: "priya@atlasfacilities.co.uk", contactPhone: "+44 20 7946 0132", source: "website", stage: "new", value: 12_900, currency: "USD", expectedClose: dateOnly(60), owner: "Amara Osei", notes: "", createdAt: iso(6), updatedAt: iso(6) },
  { code: "LD-0004", company: "Northwind Traders", contactName: "Jonas Weber", contactEmail: "jonas@northwind-traders.de", contactPhone: "+49 30 1234 5678", source: "cold_call", stage: "contacted", value: 8_400, currency: "USD", expectedClose: dateOnly(30), owner: "Theo Lindqvist", notes: "Cold call returned. Interested in warehouse shelving refresh.", createdAt: iso(19), updatedAt: iso(1) },
  { code: "LD-0005", company: "Bluepeak Logistics", contactName: "Elena Vasquez", contactEmail: "elena@bluepeaklogistics.com", contactPhone: "+1 713-555-0177", source: "outbound", stage: "contacted", value: 31_200, currency: "USD", expectedClose: dateOnly(28), owner: "Theo Lindqvist", notes: "", createdAt: iso(15), updatedAt: iso(3) },
  { code: "LD-0006", company: "Harbor & Sage", contactName: "Grace Liu", contactEmail: "grace@harborandsage.com", contactPhone: "+1 206-555-0129", source: "social", stage: "won", value: 27_800, currency: "USD", expectedClose: dateOnly(-14), owner: "Amara Osei", notes: "Signed. First order invoiced as SO-2040.", createdAt: iso(52), updatedAt: iso(14) },
  { code: "LD-0007", company: "Copperwood Co.", contactName: "Mateo Alvarez", contactEmail: "mateo@copperwoodco.com", contactPhone: "+1 602-555-0144", source: "email", stage: "proposal", value: 16_700, currency: "USD", expectedClose: dateOnly(14), owner: "Amara Osei", notes: "Comparing three vendors; we are the only ones with on-site install.", createdAt: iso(24), updatedAt: iso(1) },
  { code: "LD-0008", company: "Aster Retail Group", contactName: "Sofia Novak", contactEmail: "sofia@asterretail.com", contactPhone: "+1 646-555-0118", source: "referral", stage: "qualified", value: 44_000, currency: "USD", expectedClose: dateOnly(35), owner: "Theo Lindqvist", notes: "Rollout across 12 stores if pilot goes well.", createdAt: iso(21), updatedAt: iso(5) },
  { code: "LD-0009", company: "Vantage Healthcare", contactName: "Dr. Lena Fischer", contactEmail: "lena@vantagehealthcare.com", contactPhone: "+1 617-555-0163", source: "trade_show", stage: "new", value: 9_750, currency: "USD", expectedClose: dateOnly(55), owner: "Amara Osei", notes: "", createdAt: iso(9), updatedAt: iso(9) },
  { code: "LD-0010", company: "Brickline Manufacturing", contactName: "Omar Haddad", contactEmail: "omar@bricklinemfg.com", contactPhone: "+1 216-555-0122", source: "cold_call", stage: "lost", value: 14_250, currency: "USD", expectedClose: null, owner: "Theo Lindqvist", notes: "Went with an incumbent vendor. Revisit next fiscal year.", createdAt: iso(40), updatedAt: iso(11) },
  { code: "LD-0011", company: "Summit View Hotels", contactName: "Claire Beaumont", contactEmail: "claire@summitviewhotels.com", contactPhone: "+44 161 555 0190", source: "website", stage: "qualified", value: 38_600, currency: "USD", expectedClose: dateOnly(42), owner: "Amara Osei", notes: "Furniture package for the renovated lobby and 40 suites.", createdAt: iso(17), updatedAt: iso(2) },
  { code: "LD-0012", company: "Fjord Kitchens", contactName: "Henrik Berg", contactEmail: "henrik@fjordkitchens.no", contactPhone: "+47 22 55 01 44", source: "partner", stage: "contacted", value: 21_400, currency: "USD", expectedClose: dateOnly(38), owner: "Theo Lindqvist", notes: "Referred by Nordic Design Partners.", createdAt: iso(12), updatedAt: iso(4) },
  { code: "LD-0013", company: "Quiet Waters Spa", contactName: "Amara Diallo", contactEmail: "amara@quietwatersspa.com", contactPhone: "+1 305-555-0126", source: "outbound", stage: "new", value: 7_200, currency: "USD", expectedClose: dateOnly(48), owner: "Amara Osei", notes: "", createdAt: iso(4), updatedAt: iso(4) },
  { code: "LD-0014", company: "Meridian Legal", contactName: "Sarah Whitfield", contactEmail: "sarah@meridianlegal.com", contactPhone: "+1 202-555-0188", source: "referral", stage: "won", value: 18_900, currency: "USD", expectedClose: dateOnly(-8), owner: "Theo Lindqvist", notes: "Closed. Enterprise support tier, two offices.", createdAt: iso(46), updatedAt: iso(8) },
  { code: "LD-0015", company: "Greenfield Bakery Co.", contactName: "Elias Moreno", contactEmail: "elias@greenfieldbakery.com", contactPhone: "+1 503-555-0135", source: "social", stage: "lost", value: 4_800, currency: "USD", expectedClose: null, owner: "Amara Osei", notes: "Budget cut for the quarter.", createdAt: iso(30), updatedAt: iso(6) },
  { code: "LD-0016", company: "Ironclad Security", contactName: "Victor Reyes", contactEmail: "victor@ironcladsecurity.com", contactPhone: "+1 702-555-0194", source: "email", stage: "proposal", value: 52_000, currency: "USD", expectedClose: dateOnly(18), owner: "Theo Lindqvist", notes: "Sent proposal Thursday; follow-up call booked.", createdAt: iso(26), updatedAt: iso(1) },
  { code: "LD-0017", company: "Willow & Pine", contactName: "Ingrid Solberg", contactEmail: "ingrid@willowpine.com", contactPhone: "+45 33 14 20 55", source: "website", stage: "contacted", value: 11_300, currency: "USD", expectedClose: dateOnly(33), owner: "Amara Osei", notes: "Requested catalogue and lead times.", createdAt: iso(13), updatedAt: iso(2) },
  { code: "LD-0018", company: "Cedar Lane Properties", contactName: "Dmitri Volkov", contactEmail: "dmitri@cedarlane.com", contactPhone: "+1 512-555-0166", source: "partner", stage: "qualified", value: 29_400, currency: "USD", expectedClose: dateOnly(25), owner: "Theo Lindqvist", notes: "Came through the construction partners program.", createdAt: iso(22), updatedAt: iso(3) },
  { code: "LD-0019", company: "Horizon Analytics", contactName: "Nadia Yusuf", contactEmail: "nadia@horizonanalytics.com", contactPhone: "+1 415-555-0171", source: "cold_call", stage: "won", value: 62_500, currency: "USD", expectedClose: dateOnly(-3), owner: "Amara Osei", notes: "Closed at list price. Implementation scheduled.", createdAt: iso(58), updatedAt: iso(3) },
  { code: "LD-0020", company: "Riverton Schools", contactName: "Tomás Rojas", contactEmail: "tomas@rivertonschools.org", contactPhone: "+1 801-555-0108", source: "outbound", stage: "new", value: 15_600, currency: "USD", expectedClose: dateOnly(70), owner: "Amara Osei", notes: "Grant funding decision expected end of month.", createdAt: iso(2), updatedAt: iso(2) },
];

const toLead = (seed: SeedLead): Lead =>
  ({ ...seed, probability: LEAD_STAGE_PROBABILITY[seed.stage] }) as Lead;

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

function nextCode(records: Lead[]): string {
  const max = records.reduce((highest, lead) => {
    const number = Number(lead.code.slice(3));
    return number > highest ? number : highest;
  }, 0);
  return `LD-${String(max + 1).padStart(4, "0")}`;
}

/**
 * Reference data for the Demo Co tenant. This module is the only leads
 * surface until the ERP gateway lands (M5); endpoints then read from the
 * tenant ERPNext site and keep the same contract.
 */
@Injectable()
export class LeadsService {
  private records: Lead[] = SEED.map(toLead);

  pipeline(query: LeadPipelineQuery): LeadPipeline {
    const q = (query.q ?? "").toLowerCase().trim();
    const items = q
      ? this.records.filter((lead) =>
          [lead.company, lead.contactName, lead.contactEmail, lead.contactPhone ?? "", lead.owner ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : this.records;

    const stats = LEAD_STAGES.map(({ value, label }) => {
      const stageLeads = items.filter((lead) => lead.stage === value);
      return {
        stage: value,
        label,
        count: stageLeads.length,
        value: stageLeads.reduce((sum, lead) => sum + lead.value, 0),
      };
    });

    return { stats, items };
  }

  list(query: LeadListQuery): LeadListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((lead) => {
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
      const aValue = a[sortBy as keyof Lead];
      const bValue = b[sortBy as keyof Lead];
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

  detail(code: string): LeadDetail {
    const lead = this.records.find((record) => record.code === code);
    if (!lead) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Lead ${code} not found` });
    }
    return { ...lead, activities: activitiesFor(lead) };
  }

  create(input: CreateLeadInput): Lead {
    const lead: Lead = {
      code: nextCode(this.records),
      company: input.company,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      source: input.source ?? "website",
      stage: input.stage ?? "new",
      value: input.value,
      currency: input.currency ?? "USD",
      probability: 0,
      expectedClose: input.expectedClose ?? null,
      owner: input.owner ?? "Amara Osei",
      notes: input.notes ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    lead.probability = LEAD_STAGE_PROBABILITY[lead.stage];
    this.records.push(lead);
    return lead;
  }

  update(code: string, input: UpdateLeadInput): Lead {
    const lead = this.records.find((record) => record.code === code);
    if (!lead) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Lead ${code} not found` });
    }
    if (input.company !== undefined) lead.company = input.company;
    if (input.contactName !== undefined) lead.contactName = input.contactName;
    if (input.contactEmail !== undefined) lead.contactEmail = input.contactEmail;
    if (input.contactPhone !== undefined) lead.contactPhone = input.contactPhone;
    if (input.source !== undefined) lead.source = input.source;
    if (input.stage !== undefined) {
      lead.stage = input.stage;
      lead.probability = LEAD_STAGE_PROBABILITY[lead.stage];
    }
    if (input.value !== undefined) lead.value = input.value;
    if (input.currency !== undefined) lead.currency = input.currency;
    if (input.expectedClose !== undefined) lead.expectedClose = input.expectedClose;
    if (input.owner !== undefined) lead.owner = input.owner;
    if (input.notes !== undefined) lead.notes = input.notes;
    lead.updatedAt = new Date().toISOString();
    return lead;
  }

  moveStage(code: string, input: MoveLeadStageInput): Lead {
    return this.update(code, { stage: input.stage });
  }

  remove(code: string): void {
    const index = this.records.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Lead ${code} not found` });
    }
    this.records.splice(index, 1);
  }
}
