import { Injectable } from "@nestjs/common";
import type {
  CreateCrmContactInput,
  CrmContact,
  CrmContactListQuery,
  CrmContactListResponse,
  UpdateCrmContactInput,
} from "@amni/shared";

import type { GatewayRequestMeta, GatewayUser } from "../erp-gateway/erp-gateway.service";
import { newId } from "./crm-common";
// Value import required so TypeScript emits Nest constructor metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { CrmRecordRepository } from "./crm-record.repository";

const SORT_FIELD: Record<string, string> = {
  firstName: "title",
  lastName: "title",
  email: "email",
  company: "category",
  jobTitle: "category",
  createdAt: "creation",
  updatedAt: "modified",
};

@Injectable()
export class CrmContactsService {
  constructor(private readonly records: CrmRecordRepository) {}

  async list(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    query: CrmContactListQuery,
  ): Promise<CrmContactListResponse> {
    const { items, total } = await this.records.list<CrmContact>(user, meta, "contact", {
      filters: { reference_code: query.organizationCode },
      q: query.q,
      orderBy: `${SORT_FIELD[query.sortBy ?? "updatedAt"] ?? "modified"} ${query.sortDir ?? "desc"}`,
      start: (query.page - 1) * query.pageSize,
      pageLength: query.pageSize,
    });
    return { items, meta: { total, page: query.page, pageSize: query.pageSize } };
  }

  async listForOrganizations(user: GatewayUser, meta: GatewayRequestMeta): Promise<CrmContact[]> {
    return (await this.records.list<CrmContact>(user, meta, "contact", { pageLength: 100 })).items;
  }

  byCode(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<CrmContact> {
    return this.records.get<CrmContact>(user, meta, "contact", code);
  }

  detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<CrmContact> {
    return this.byCode(user, meta, code);
  }

  async create(user: GatewayUser, meta: GatewayRequestMeta, input: CreateCrmContactInput): Promise<CrmContact> {
    const now = new Date().toISOString();
    const contact: CrmContact = {
      code: newId("CC"),
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
      createdAt: now,
      updatedAt: now,
    };
    return this.records.create(user, meta, "contact", contact.code, contact, indexesFor(contact));
  }

  async update(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    input: UpdateCrmContactInput,
  ): Promise<CrmContact> {
    const current = await this.byCode(user, meta, code);
    const contact: CrmContact = { ...current, ...input, code, updatedAt: new Date().toISOString() };
    return this.records.update(user, meta, "contact", code, contact, indexesFor(contact));
  }

  remove(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    return this.records.remove(user, meta, "contact", code);
  }
}

function indexesFor(contact: CrmContact) {
  return {
    title: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
    email: contact.email,
    category: contact.company ?? contact.jobTitle,
    referenceType: contact.organizationCode ? "organization" : undefined,
    referenceCode: contact.organizationCode ?? undefined,
    searchText: [contact.firstName, contact.lastName, contact.email, contact.company, contact.jobTitle]
      .filter(Boolean)
      .join(" "),
  };
}
