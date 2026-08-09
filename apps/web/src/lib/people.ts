import type { BadgeProps } from "@amni/ui";
import type { ContactDetail, ContactListResponse, ContactStatus } from "@amni/shared";

import { api } from "@/src/lib/api";

export const contactStatusBadge: Record<ContactStatus, BadgeProps["variant"]> = {
  active: "success",
  inactive: "secondary",
};

export function contactStatusLabel(status: ContactStatus): string {
  return status === "active" ? "Active" : "Inactive";
}

export function getContacts(): Promise<ContactListResponse> {
  return api<ContactListResponse>("/contacts?page=1&pageSize=100&sortBy=firstName&sortDir=asc");
}

export function getContact(id: string): Promise<ContactDetail> {
  return api<ContactDetail>(`/contacts/${encodeURIComponent(id)}`);
}
