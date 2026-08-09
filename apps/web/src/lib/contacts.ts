import type {
  Contact,
  ContactListQuery,
  ContactListResponse,
  CreateContactInput,
  UpdateContactInput,
} from "@amni/shared";

import { apiRequest, toQueryString } from "./client";

export const contactsClient = {
  list(query: Partial<ContactListQuery> = {}): Promise<ContactListResponse> {
    const { page, pageSize, q, sortBy, sortDir, status } = query;
    return apiRequest<ContactListResponse>(
      "/people/contacts",
      toQueryString({ page, pageSize, q, sortBy, sortDir, status }),
    );
  },
  detail(code: string): Promise<Contact> {
    return apiRequest<Contact>("/people/contacts", `/${encodeURIComponent(code)}`);
  },
  create(input: CreateContactInput): Promise<Contact> {
    return apiRequest<Contact>("/people/contacts", "/", { method: "POST", body: input });
  },
  update(code: string, input: UpdateContactInput): Promise<Contact> {
    return apiRequest<Contact>("/people/contacts", `/${encodeURIComponent(code)}`, {
      method: "PATCH",
      body: input,
    });
  },
  remove(code: string): Promise<void> {
    return apiRequest<void>("/people/contacts", `/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
};
