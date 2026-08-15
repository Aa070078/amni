import { Injectable } from "@nestjs/common";
import {
  CONTACT_FIELDS,
  SALES_DOCTYPE,
  buildContactDoc,
  type ErpContactDoc,
} from "@amni/erp";
import {
  type Contact,
  type ContactListQuery,
  type ContactListResponse,
  type CreateContactInput,
  type UpdateContactInput,
} from "@amni/shared";

import { toIso } from "../common/frappe";
// Value import required so tsc emits `design:paramtypes` for Nest DI metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { ErpGatewayService } from "../erp-gateway/erp-gateway.service";
import { translateErpError, type GatewayRequestMeta, type GatewayUser } from "../erp-gateway/erp-gateway.service";

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

type ErpContactRaw = ErpContactDoc & { creation?: string; modified?: string };

function toContact(doc: ErpContactRaw): Contact {
  return {
    code: doc.name,
    firstName: doc.first_name ?? "",
    lastName: doc.last_name,
    email: doc.email_id,
    phone: doc.mobile_no,
    jobTitle: doc.designation,
    department: doc.department,
    company: doc.company_name,
    address: undefined,
    notes: undefined,
    status: "active",
    createdAt: toIso(doc.creation ?? doc.modified),
    updatedAt: toIso(doc.modified ?? doc.creation),
  };
}

function sortValue(contact: Contact, sortBy: string): unknown {
  return contact[sortBy as keyof Contact];
}

/**
 * Contacts backed by the tenant's real ERPNext Contact doctype. ERPNext has no
 * address / notes / disabled flag on the Contact doctype, so address and notes
 * are always absent and status is always "active".
 */
@Injectable()
export class ContactsService {
  constructor(private readonly gateway: ErpGatewayService) {}

  async list(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    query: ContactListQuery,
  ): Promise<ContactListResponse> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const { items: docs } = await client.list<ErpContactRaw>(SALES_DOCTYPE.contact, {
      limitPageLength: 0,
    });

    let records = docs.map(toContact);
    if (query.status) {
      records = records.filter((contact) => contact.status === query.status);
    }

    const q = (query.q ?? "").toLowerCase().trim();
    if (q) {
      records = records.filter((contact) =>
        [
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
          .includes(q),
      );
    }

    const sortBy = query.sortBy && SORT_WHITELIST.has(query.sortBy) ? query.sortBy : "createdAt";
    const sortDir = query.sortDir === "asc" ? 1 : -1;
    const sorted = [...records].sort((a, b) => {
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

  async detail(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<Contact> {
    const { client } = await this.gateway.scopeFor(user.id, meta.requestId);
    const doc = await client
      .get<ErpContactRaw>(SALES_DOCTYPE.contact, code)
      .catch((err) => translateErpError(err, "Contact"));
    return toContact(doc);
  }

  async create(user: GatewayUser, meta: GatewayRequestMeta, input: CreateContactInput): Promise<Contact> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const created = await client.create<ErpContactDoc>(
      SALES_DOCTYPE.contact,
      buildContactDoc({
        firstName: input.firstName ?? "Untitled contact",
        lastName: input.lastName,
        email: input.email,
        mobileNo: input.phone,
        companyName: input.company,
        department: input.department,
        jobTitle: input.jobTitle,
      }),
    );
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "contact.create",
      resourceType: SALES_DOCTYPE.contact,
      resourceId: created.name,
    });
    return toContact(created);
  }

  async update(
    user: GatewayUser,
    meta: GatewayRequestMeta,
    code: string,
    input: UpdateContactInput,
  ): Promise<Contact> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    const patch: Record<string, unknown> = {};
    if (input.firstName !== undefined) patch[CONTACT_FIELDS.firstName] = input.firstName;
    if (input.lastName !== undefined) patch[CONTACT_FIELDS.lastName] = input.lastName;
    if (input.email !== undefined) patch[CONTACT_FIELDS.email] = input.email;
    if (input.phone !== undefined) patch[CONTACT_FIELDS.mobileNo] = input.phone;
    if (input.jobTitle !== undefined) patch[CONTACT_FIELDS.jobTitle] = input.jobTitle;
    if (input.department !== undefined) patch[CONTACT_FIELDS.department] = input.department;
    if (input.company !== undefined) patch[CONTACT_FIELDS.companyName] = input.company;

    const updated = await client
      .update<ErpContactDoc>(SALES_DOCTYPE.contact, code, patch)
      .catch((err) => translateErpError(err, "Contact"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "contact.update",
      resourceType: SALES_DOCTYPE.contact,
      resourceId: code,
    });
    return toContact(updated);
  }

  async remove(user: GatewayUser, meta: GatewayRequestMeta, code: string): Promise<void> {
    const { client, companyId } = await this.gateway.scopeFor(user.id, meta.requestId);
    await client.delete(SALES_DOCTYPE.contact, code).catch((err) => translateErpError(err, "Contact"));
    await this.gateway.audit({
      user,
      meta,
      companyId,
      action: "contact.delete",
      resourceType: SALES_DOCTYPE.contact,
      resourceId: code,
    });
  }
}
