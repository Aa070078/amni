import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateOrganizationInput,
  type Organization,
  type OrganizationDetail,
  type OrganizationListQuery,
  type OrganizationListResponse,
  type UpdateOrganizationInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import { iso, nextCode, paginate, sortRecords } from "./crm-common";
import { type CrmContactsService } from "./contacts.service";
import { type DealsService } from "../deals/deals.service";

const SORT_WHITELIST = new Set(["name", "industry", "territory", "status", "annualRevenue", "employeeCount", "createdAt", "updatedAt"]);

const OPEN_DEAL_STAGES = new Set(["qualification", "analysis", "proposal", "negotiation"]);

const SEED: Organization[] = [
  { code: "ORG-0001", name: "Serenity Interiors", website: "https://serenityinteriors.com", email: "hello@serenityinteriors.com", phone: "+1 415-555-0142", linkedin: "https://linkedin.com/company/serenity-interiors", industry: "architecture", territory: "national", annualRevenue: 4_200_000, employeeCount: 48, status: "active", address: { addressLine1: "1800 Marina Blvd", city: "San Francisco", state: "CA", zip: "94123", country: "USA" }, owner: "Amara Osei", createdAt: iso(120), updatedAt: iso(2) },
  { code: "ORG-0002", name: "Lumina Supplies", website: "https://luminasupplies.com", email: "sales@luminasupplies.com", phone: "+1 312-555-0198", industry: "manufacturing", territory: "national", annualRevenue: 11_500_000, employeeCount: 210, status: "active", address: { addressLine1: "4400 W 47th St", city: "Chicago", state: "IL", zip: "60632", country: "USA" }, owner: "Amara Osei", createdAt: iso(110), updatedAt: iso(3) },
  { code: "ORG-0003", name: "Northwind Traders", website: "https://northwind-traders.de", email: "kontakt@northwind-traders.de", phone: "+49 30 1234 5678", industry: "logistics", territory: "global", annualRevenue: 23_000_000, employeeCount: 540, status: "active", address: { addressLine1: "Uhlandstraße 12", city: "Berlin", country: "Germany" }, owner: "Theo Lindqvist", createdAt: iso(95), updatedAt: iso(4) },
  { code: "ORG-0004", name: "Meridian Legal", website: "https://meridianlegal.com", email: "info@meridianlegal.com", phone: "+1 202-555-0188", industry: "legal", territory: "regional", annualRevenue: 8_900_000, employeeCount: 96, status: "active", address: { addressLine1: "900 K St NW", city: "Washington", state: "DC", zip: "20001", country: "USA" }, owner: "Theo Lindqvist", createdAt: iso(85), updatedAt: iso(8) },
  { code: "ORG-0005", name: "Summit View Hotels", website: "https://summitviewhotels.com", email: "bookings@summitviewhotels.com", phone: "+44 161 555 0190", industry: "hospitality", territory: "global", annualRevenue: 32_400_000, employeeCount: 890, status: "active", address: { addressLine1: "2 Deansgate", city: "Manchester", country: "UK" }, owner: "Amara Osei", createdAt: iso(75), updatedAt: iso(2) },
  { code: "ORG-0006", name: "Aster Retail Group", website: "https://asterretail.com", email: "ops@asterretail.com", phone: "+1 646-555-0118", industry: "retail", territory: "national", annualRevenue: 5_600_000, employeeCount: 320, status: "lead", address: { addressLine1: "520 Broadway", city: "New York", state: "NY", zip: "10012", country: "USA" }, owner: "Theo Lindqvist", createdAt: iso(60), updatedAt: iso(3) },
  { code: "ORG-0007", name: "Horizon Analytics", website: "https://horizonanalytics.com", email: "hello@horizonanalytics.com", phone: "+1 415-555-0171", industry: "software", territory: "global", annualRevenue: 6_800_000, employeeCount: 150, status: "active", address: { addressLine1: "One Market Plaza", city: "San Francisco", state: "CA", zip: "94105", country: "USA" }, owner: "Amara Osei", createdAt: iso(55), updatedAt: iso(3) },
  { code: "ORG-0008", name: "Fjord Kitchens", website: "https://fjordkitchens.no", email: "post@fjordkitchens.no", phone: "+47 22 55 01 44", industry: "construction", territory: "regional", annualRevenue: 3_400_000, employeeCount: 72, status: "lead", address: { addressLine1: "Akersgata 8", city: "Oslo", country: "Norway" }, owner: "Theo Lindqvist", createdAt: iso(48), updatedAt: iso(2) },
  { code: "ORG-0009", name: "Copperwood Co.", website: "https://copperwoodco.com", email: "hello@copperwoodco.com", phone: "+1 602-555-0144", industry: "manufacturing", territory: "regional", annualRevenue: 1_900_000, employeeCount: 35, status: "inactive", address: { addressLine1: "1020 E Washington St", city: "Phoenix", state: "AZ", zip: "85034", country: "USA" }, owner: "Amara Osei", createdAt: iso(40), updatedAt: iso(16) },
  { code: "ORG-0010", name: "Vantage Healthcare", website: "https://vantagehealthcare.com", email: "info@vantagehealthcare.com", phone: "+1 617-555-0163", industry: "healthcare", territory: "regional", annualRevenue: 17_200_000, employeeCount: 410, status: "active", address: { addressLine1: "245 Summer St", city: "Boston", state: "MA", zip: "02210", country: "USA" }, owner: "Amara Osei", createdAt: iso(35), updatedAt: iso(2) },
];

@Injectable()
export class CrmOrganizationsService {
  private records: Organization[] = structuredClone(SEED);

  constructor(
    private readonly contacts: CrmContactsService,
    private readonly deals: DealsService,
  ) {}

  list(query: OrganizationListQuery): OrganizationListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((org) => {
      if (query.status && org.status !== query.status) return false;
      if (query.industry && org.industry !== query.industry) return false;
      if (!q) return true;
      return [org.name, org.website ?? "", org.email ?? "", org.industry ?? "", org.owner ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const sorted = sortRecords(filtered, query.sortBy, query.sortDir ?? "asc", SORT_WHITELIST);
    const { items, total } = paginate(sorted, query.page, query.pageSize);

    const linkedCodes = new Set(this.contacts.listForOrganizations().map((contact) => contact.organizationCode));
    const stats = {
      total: this.records.length,
      active: this.records.filter((org) => org.status === "active").length,
      leads: this.records.filter((org) => org.status === "lead").length,
      contacts: linkedCodes.size,
      openDealValue: this.sumOpenDealValue(),
    };

    return { items, meta: { total, page: query.page, pageSize: query.pageSize }, stats };
  }

  detail(code: string): OrganizationDetail {
    const org = this.find(code);
    const contacts = this.contacts.listForOrganizations().filter((contact) => contact.organizationCode === code);
    const deals = this.dealsFor(org.name);
    return {
      ...org,
      contactCount: contacts.length,
      dealCount: deals.length,
      openDealValue: deals.filter((deal) => OPEN_DEAL_STAGES.has(deal.stage)).reduce((sum, deal) => sum + deal.value, 0),
    };
  }

  create(input: CreateOrganizationInput): Organization {
    const org: Organization = {
      code: nextCode(this.records, "ORG"),
      name: input.name,
      website: input.website,
      email: input.email,
      phone: input.phone,
      linkedin: input.linkedin,
      industry: input.industry,
      territory: input.territory,
      annualRevenue: input.annualRevenue,
      employeeCount: input.employeeCount,
      status: input.status ?? "lead",
      address: input.address,
      notes: input.notes,
      owner: input.owner,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.records.push(org);
    return org;
  }

  update(code: string, input: UpdateOrganizationInput): Organization {
    const org = this.find(code);
    if (input.name !== undefined) org.name = input.name;
    if (input.website !== undefined) org.website = input.website;
    if (input.email !== undefined) org.email = input.email;
    if (input.phone !== undefined) org.phone = input.phone;
    if (input.linkedin !== undefined) org.linkedin = input.linkedin;
    if (input.industry !== undefined) org.industry = input.industry;
    if (input.territory !== undefined) org.territory = input.territory;
    if (input.annualRevenue !== undefined) org.annualRevenue = input.annualRevenue;
    if (input.employeeCount !== undefined) org.employeeCount = input.employeeCount;
    if (input.status !== undefined) org.status = input.status;
    if (input.address !== undefined) org.address = input.address;
    if (input.notes !== undefined) org.notes = input.notes;
    if (input.owner !== undefined) org.owner = input.owner;
    org.updatedAt = new Date().toISOString();
    return org;
  }

  remove(code: string): void {
    const index = this.records.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Organization ${code} not found` });
    }
    this.records.splice(index, 1);
  }

  private find(code: string): Organization {
    const org = this.records.find((record) => record.code === code);
    if (!org) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Organization ${code} not found` });
    }
    return org;
  }

  private dealsFor(name: string) {
    return this.deals.list({ page: 1, pageSize: 100, q: name, sortDir: "asc" }).items;
  }

  private sumOpenDealValue(): number {
    let total = 0;
    for (const org of this.records) {
      for (const deal of this.dealsFor(org.name)) {
        if (OPEN_DEAL_STAGES.has(deal.stage)) total += deal.value;
      }
    }
    return total;
  }
}
