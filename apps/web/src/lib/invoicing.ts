import type {
  CreateCreditNoteInput,
  CreateRecurringProfileInput,
  CreditNote,
  CreditNoteListQuery,
  CreditNoteListResponse,
  CreditNoteStatus,
  InvoicingOverview,
  RecurringProfile,
  RecurringListQuery,
  RecurringListResponse,
  RecurringProfileStatus,
} from "@amni/shared";
import { apiRequest, toQueryString } from "./client";

export const invoicingClient = {
  overview(): Promise<InvoicingOverview> {
    return apiRequest<InvoicingOverview>("/invoicing", "/overview");
  },
  listCreditNotes(query: Partial<CreditNoteListQuery> = {}): Promise<CreditNoteListResponse> {
    const { page, pageSize, q, sortBy, sortDir, status } = query;
    return apiRequest<CreditNoteListResponse>(
      "/invoicing",
      `/credit-notes${toQueryString({ page, pageSize, q, sortBy, sortDir, status })}`,
    );
  },
  creditNoteDetail(code: string): Promise<CreditNote> {
    return apiRequest<CreditNote>("/invoicing", `/credit-notes/${encodeURIComponent(code)}`);
  },
  createCreditNote(input: CreateCreditNoteInput): Promise<CreditNote> {
    return apiRequest<CreditNote>("/invoicing", "/credit-notes", { method: "POST", body: input });
  },
  changeCreditNoteStatus(code: string, status: CreditNoteStatus): Promise<CreditNote> {
    return apiRequest<CreditNote>("/invoicing", `/credit-notes/${encodeURIComponent(code)}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
  removeCreditNote(code: string): Promise<void> {
    return apiRequest<void>("/invoicing", `/credit-notes/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
  listRecurring(query: Partial<RecurringListQuery> = {}): Promise<RecurringListResponse> {
    const { page, pageSize, q, sortBy, sortDir, status } = query;
    return apiRequest<RecurringListResponse>(
      "/invoicing",
      `/recurring${toQueryString({ page, pageSize, q, sortBy, sortDir, status })}`,
    );
  },
  recurringDetail(code: string): Promise<RecurringProfile> {
    return apiRequest<RecurringProfile>("/invoicing", `/recurring/${encodeURIComponent(code)}`);
  },
  createRecurring(input: CreateRecurringProfileInput): Promise<RecurringProfile> {
    return apiRequest<RecurringProfile>("/invoicing", "/recurring", { method: "POST", body: input });
  },
  changeRecurringStatus(code: string, status: RecurringProfileStatus): Promise<RecurringProfile> {
    return apiRequest<RecurringProfile>("/invoicing", `/recurring/${encodeURIComponent(code)}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
  removeRecurring(code: string): Promise<void> {
    return apiRequest<void>("/invoicing", `/recurring/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
};
