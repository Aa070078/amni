import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type Contact,
  type ContactListQuery,
  type ContactListResponse,
  type CreateContactInput,
  type UpdateContactInput,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";

const DAY_MS = 86_400_000;
const iso = (daysAgo: number): string => new Date(Date.now() - daysAgo * DAY_MS).toISOString();

const SORT_WHITELIST = new Set([
  "code",
  "firstName",
  "lastName",
  "email",
  "jobTitle",
  "department",
  "company",
  "status",
  "createdAt",
  "updatedAt",
]);

const SEED: Contact[] = [
  { code: "CON-0001", firstName: "Amira", lastName: "Haddad", email: "amira.haddad@democo.io", phone: "+20 2 456 1100", jobTitle: "Chief Executive Officer", department: "Executive", company: "Demo Co", address: "10 Innovation Drive, Cairo", notes: "Primary decision maker.", status: "active", createdAt: iso(120), updatedAt: iso(4) },
  { code: "CON-0002", firstName: "Daniel", lastName: "Osei", email: "daniel.osei@democo.io", phone: "+233 30 274 9901", jobTitle: "Head of Sales", department: "Sales", company: "Demo Co", status: "active", createdAt: iso(112), updatedAt: iso(6) },
  { code: "CON-0003", firstName: "Lena", lastName: "Fischer", email: "lena.fischer@democo.io", phone: "+49 30 901 204", jobTitle: "Operations Manager", department: "Operations", company: "Demo Co", status: "active", createdAt: iso(104), updatedAt: iso(3) },
  { code: "CON-0004", firstName: "Omar", lastName: "Khalil", email: "omar.khalil@democo.io", phone: "+20 2 456 1120", jobTitle: "Procurement Lead", department: "Purchasing", company: "Demo Co", notes: "Approves supplier onboarding.", status: "active", createdAt: iso(96), updatedAt: iso(9) },
  { code: "CON-0005", firstName: "Priya", lastName: "Nair", email: "priya.nair@democo.io", phone: "+91 80 4661 3300", jobTitle: "Finance Manager", department: "Finance", company: "Demo Co", status: "active", createdAt: iso(88), updatedAt: iso(5) },
  { code: "CON-0006", firstName: "Sofia", lastName: "Rossi", email: "sofia.rossi@democo.io", phone: "+39 02 3490 8810", jobTitle: "Marketing Lead", department: "Marketing", company: "Demo Co", status: "active", createdAt: iso(80), updatedAt: iso(11) },
  { code: "CON-0007", firstName: "Tomás", lastName: "Silva", email: "tomas.silva@democo.io", phone: "+351 21 456 2300", jobTitle: "IT Administrator", department: "IT", company: "Demo Co", status: "active", createdAt: iso(72), updatedAt: iso(7) },
  { code: "CON-0008", firstName: "Emma", lastName: "Lindqvist", email: "emma.lindqvist@democo.io", phone: "+46 8 556 887 00", jobTitle: "Customer Success", department: "Customer Success", company: "Demo Co", status: "active", createdAt: iso(64), updatedAt: iso(2) },
  { code: "CON-0009", firstName: "James", lastName: "Carter", email: "james.carter@baker-sterling.com", phone: "+44 20 7946 0234", jobTitle: "External Auditor", department: "External", company: "Baker & Sterling", address: "12 Finance Row, London", notes: "Year-end audit contact.", status: "inactive", createdAt: iso(50), updatedAt: iso(16) },
  { code: "CON-0010", firstName: "Aisha", lastName: "Bello", email: "aisha.bello@belloandpartners.ng", phone: "+234 1 270 3344", jobTitle: "Legal Counsel", department: "Legal", company: "Bello & Partners", status: "active", createdAt: iso(38), updatedAt: iso(10) },
];

function nextCode(records: Contact[]): string {
  const max = records.reduce((highest, contact) => {
    const number = Number(contact.code.slice(4));
    return number > highest ? number : highest;
  }, 0);
  return `CON-${String(max + 1).padStart(4, "0")}`;
}

function sortValue(contact: Contact, sortBy: string): unknown {
  return contact[sortBy as keyof Contact];
}

/**
 * Reference data for the Demo Co tenant. This module is the only contacts
 * surface until the ERP gateway lands (M5); endpoints then read from the
 * tenant ERPNext site and keep the same contract.
 */
@Injectable()
export class ContactsService {
  private records: Contact[] = structuredClone(SEED);

  list(query: ContactListQuery): ContactListResponse {
    const q = (query.q ?? "").toLowerCase().trim();
    const filtered = this.records.filter((contact) => {
      if (query.status && contact.status !== query.status) return false;
      if (!q) return true;
      return [
        contact.code,
        contact.firstName,
        contact.lastName ?? "",
        contact.email ?? "",
        contact.jobTitle ?? "",
        contact.department ?? "",
        contact.company ?? "",
      ]
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

    const page = query.page;
    const pageSize = query.pageSize;
    const start = (page - 1) * pageSize;
    return {
      items: sorted.slice(start, start + pageSize),
      meta: { total: sorted.length, page, pageSize },
    };
  }

  detail(code: string): Contact {
    const contact = this.records.find((record) => record.code === code);
    if (!contact) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Contact ${code} not found` });
    }
    return contact;
  }

  create(input: CreateContactInput): Contact {
    const contact: Contact = {
      code: nextCode(this.records),
      firstName: input.firstName ?? "Untitled contact",
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      jobTitle: input.jobTitle,
      department: input.department,
      company: input.company,
      address: input.address,
      notes: input.notes,
      status: input.status ?? "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.records.push(contact);
    return contact;
  }

  update(code: string, input: UpdateContactInput): Contact {
    const contact = this.records.find((record) => record.code === code);
    if (!contact) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: `Contact ${code} not found` });
    }
    if (input.firstName !== undefined) contact.firstName = input.firstName;
    if (input.lastName !== undefined) contact.lastName = input.lastName;
    if (input.email !== undefined) contact.email = input.email;
    if (input.phone !== undefined) contact.phone = input.phone;
    if (input.jobTitle !== undefined) contact.jobTitle = input.jobTitle;
    if (input.department !== undefined) contact.department = input.department;
    if (input.company !== undefined) contact.company = input.company;
    if (input.address !== undefined) contact.address = input.address;
    if (input.notes !== undefined) contact.notes = input.notes;
    if (input.status !== undefined) contact.status = input.status;
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
