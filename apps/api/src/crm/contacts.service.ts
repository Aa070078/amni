import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type CreateCrmContactInput,
  type CrmContact,
  type CrmContactListQuery,
  type CrmContactListResponse,
  type UpdateCrmContactInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import { iso, nextCode, paginate, sortRecords } from "./crm-common";

const SORT_WHITELIST = new Set(["firstName", "lastName", "email", "company", "jobTitle", "createdAt", "updatedAt"]);

const SEED: CrmContact[] = [
  { code: "CC-0001", firstName: "Maya", lastName: "Chen", email: "maya@serenityinteriors.com", mobileNo: "+1 415-555-0142", jobTitle: "Facilities Director", company: "Serenity Interiors", organizationCode: "ORG-0001", isPrimary: true, address: "1800 Marina Blvd, San Francisco, CA", createdAt: iso(110), updatedAt: iso(2) },
  { code: "CC-0002", firstName: "Dario", lastName: "Beltran", email: "dario@luminasupplies.com", mobileNo: "+1 312-555-0198", jobTitle: "Procurement Lead", company: "Lumina Supplies", organizationCode: "ORG-0002", isPrimary: true, createdAt: iso(95), updatedAt: iso(3) },
  { code: "CC-0003", firstName: "Jonas", lastName: "Weber", email: "jonas@northwind-traders.de", mobileNo: "+49 30 1234 5678", jobTitle: "Operations Manager", company: "Northwind Traders", organizationCode: "ORG-0003", isPrimary: true, createdAt: iso(88), updatedAt: iso(4) },
  { code: "CC-0004", firstName: "Sarah", lastName: "Whitfield", email: "sarah@meridianlegal.com", mobileNo: "+1 202-555-0188", jobTitle: "Managing Partner", company: "Meridian Legal", organizationCode: "ORG-0004", isPrimary: true, createdAt: iso(80), updatedAt: iso(8) },
  { code: "CC-0005", firstName: "Claire", lastName: "Beaumont", email: "claire@summitviewhotels.com", mobileNo: "+44 161 555 0190", jobTitle: "Head of Procurement", company: "Summit View Hotels", organizationCode: "ORG-0005", isPrimary: true, createdAt: iso(70), updatedAt: iso(2) },
  { code: "CC-0006", firstName: "Sofia", lastName: "Novak", email: "sofia@asterretail.com", mobileNo: "+1 646-555-0118", jobTitle: "Growth Manager", company: "Aster Retail Group", organizationCode: "ORG-0006", isPrimary: true, createdAt: iso(55), updatedAt: iso(3) },
  { code: "CC-0007", firstName: "Nadia", lastName: "Yusuf", email: "nadia@horizonanalytics.com", mobileNo: "+1 415-555-0171", jobTitle: "IT Director", company: "Horizon Analytics", organizationCode: "ORG-0007", isPrimary: true, createdAt: iso(50), updatedAt: iso(3) },
  { code: "CC-0008", firstName: "Henrik", lastName: "Berg", email: "henrik@fjordkitchens.no", mobileNo: "+47 22 55 01 44", jobTitle: "Director", company: "Fjord Kitchens", organizationCode: "ORG-0008", isPrimary: true, createdAt: iso(45), updatedAt: iso(2) },
  { code: "CC-0009", firstName: "Mateo", lastName: "Alvarez", email: "mateo@copperwoodco.com", mobileNo: "+1 602-555-0144", jobTitle: "Owner", company: "Copperwood Co.", organizationCode: "ORG-0009", isPrimary: true, createdAt: iso(40), updatedAt: iso(16) },
  { code: "CC-0010", firstName: "Lena", lastName: "Fischer", email: "lena@vantagehealthcare.com", mobileNo: "+1 617-555-0163", jobTitle: "Chief Medical Officer", company: "Vantage Healthcare", organizationCode: "ORG-0010", isPrimary: true, createdAt: iso(35), updatedAt: iso(2) },
];

@Injectable()
export class CrmContactsService {
  private records: CrmContact[] = structuredClone(SEED);

  list(query: CrmContactListQuery): CrmContactListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((contact) => {
      if (query.organizationCode && contact.organizationCode !== query.organizationCode) return false;
      if (!q) return true;
      return [contact.firstName, contact.lastName ?? "", contact.email ?? "", contact.company ?? "", contact.jobTitle ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    const sorted = sortRecords(filtered, query.sortBy, query.sortDir ?? "asc", SORT_WHITELIST);
    const { items, total } = paginate(sorted, query.page, query.pageSize);
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  listForOrganizations(): CrmContact[] {
    return this.records;
  }

  byCode(code: string): CrmContact {
    const contact = this.records.find((record) => record.code === code);
    if (!contact) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Contact ${code} not found` });
    }
    return contact;
  }

  detail(code: string): CrmContact {
    return this.byCode(code);
  }

  create(input: CreateCrmContactInput): CrmContact {
    const contact: CrmContact = {
      code: nextCode(this.records, "CC"),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      mobileNo: input.mobileNo,
      jobTitle: input.jobTitle,
      department: input.department,
      company: input.company,
      organizationCode: input.organizationCode,
      isPrimary: input.isPrimary ?? false,
      address: input.address,
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.records.push(contact);
    return contact;
  }

  update(code: string, input: UpdateCrmContactInput): CrmContact {
    const contact = this.byCode(code);
    if (input.firstName !== undefined) contact.firstName = input.firstName;
    if (input.lastName !== undefined) contact.lastName = input.lastName;
    if (input.email !== undefined) contact.email = input.email;
    if (input.mobileNo !== undefined) contact.mobileNo = input.mobileNo;
    if (input.jobTitle !== undefined) contact.jobTitle = input.jobTitle;
    if (input.department !== undefined) contact.department = input.department;
    if (input.company !== undefined) contact.company = input.company;
    if (input.organizationCode !== undefined) contact.organizationCode = input.organizationCode;
    if (input.isPrimary !== undefined) contact.isPrimary = input.isPrimary;
    if (input.address !== undefined) contact.address = input.address;
    if (input.notes !== undefined) contact.notes = input.notes;
    contact.updatedAt = new Date().toISOString();
    return contact;
  }

  remove(code: string): void {
    const index = this.records.findIndex((record) => record.code === code);
    if (index === -1) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Contact ${code} not found` });
    }
    this.records.splice(index, 1);
  }
}
