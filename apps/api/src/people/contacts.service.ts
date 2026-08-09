import { Injectable } from "@nestjs/common";
import {
  ErrorCode,
  type ContactDetail,
  type ContactListQuery,
  type ContactListResponse,
  type ContactSummary,
} from "@amni/shared";

import { ApiException } from "../common/api.exception";
import { CONTACTS } from "./contacts.reference";

const SORT_KEYS = new Set(["firstName", "lastName", "title", "department", "createdAt"]);

function toSummary(contact: ContactDetail): ContactSummary {
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    title: contact.title,
    department: contact.department,
    status: contact.status,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}

@Injectable()
export class ContactsService {
  list(query: ContactListQuery): ContactListResponse {
    const { page, pageSize, sortBy, sortDir, q, status, department } = query;

    let rows = CONTACTS.map(toSummary);
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter((contact) =>
        [contact.firstName, contact.lastName, contact.email, contact.title, contact.department]
          .filter((value): value is string => value !== undefined)
          .some((value) => value.toLowerCase().includes(needle)),
      );
    }
    if (status) rows = rows.filter((contact) => contact.status === status);
    if (department) rows = rows.filter((contact) => contact.department === department);

    const sortKey = sortBy && SORT_KEYS.has(sortBy) ? sortBy : "firstName";
    const direction = sortDir === "desc" ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === undefined || bv === undefined) return 0;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * direction;
      return String(av).localeCompare(String(bv)) * direction;
    });

    const total = rows.length;
    const start = (page - 1) * pageSize;
    return { items: rows.slice(start, start + pageSize), meta: { total, page, pageSize } };
  }

  getById(id: string): ContactDetail {
    const contact = CONTACTS.find((entry) => entry.id === id);
    if (!contact) {
      throw new ApiException({ code: ErrorCode.NOT_FOUND, status: 404, message: "Contact not found" });
    }
    return contact;
  }
}
