import type {
  Account,
  AccountListQuery,
  AccountListResponse,
  AccountStatus,
  AccountingOverview,
  CreateAccountInput,
  CreateJournalEntryInput,
  JournalEntry,
  JournalEntryListQuery,
  JournalEntryListResponse,
  JournalEntryStatus,
  Ledger,
  TrialBalance,
} from "@amni/shared";
import { apiRequest, toQueryString } from "./client";

export const accountingClient = {
  overview(): Promise<AccountingOverview> {
    return apiRequest<AccountingOverview>("/accounting", "/overview");
  },
  listAccounts(query: Partial<AccountListQuery> = {}): Promise<AccountListResponse> {
    const { page, pageSize, q, sortBy, sortDir, type, status } = query;
    return apiRequest<AccountListResponse>("/accounting", toQueryString({ page, pageSize, q, sortBy, sortDir, type, status }));
  },
  accountDetail(code: string): Promise<Account> {
    return apiRequest<Account>("/accounting", `/accounts/${encodeURIComponent(code)}`);
  },
  createAccount(input: CreateAccountInput): Promise<Account> {
    return apiRequest<Account>("/accounting", "/accounts", { method: "POST", body: input });
  },
  changeAccountStatus(code: string, status: AccountStatus): Promise<Account> {
    return apiRequest<Account>("/accounting", `/accounts/${encodeURIComponent(code)}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
  removeAccount(code: string): Promise<void> {
    return apiRequest<void>("/accounting", `/accounts/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
  listJournalEntries(query: Partial<JournalEntryListQuery> = {}): Promise<JournalEntryListResponse> {
    const { page, pageSize, q, sortBy, sortDir, status } = query;
    return apiRequest<JournalEntryListResponse>(
      "/accounting",
      toQueryString({ page, pageSize, q, sortBy, sortDir, status }),
    );
  },
  journalEntryDetail(code: string): Promise<JournalEntry> {
    return apiRequest<JournalEntry>("/accounting", `/journal-entries/${encodeURIComponent(code)}`);
  },
  createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntry> {
    return apiRequest<JournalEntry>("/accounting", "/journal-entries", { method: "POST", body: input });
  },
  changeJournalEntryStatus(code: string, status: JournalEntryStatus): Promise<JournalEntry> {
    return apiRequest<JournalEntry>("/accounting", `/journal-entries/${encodeURIComponent(code)}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
  removeJournalEntry(code: string): Promise<void> {
    return apiRequest<void>("/accounting", `/journal-entries/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
  trialBalance(): Promise<TrialBalance> {
    return apiRequest<TrialBalance>("/accounting", "/reports/trial-balance");
  },
  ledger(accountCode: string): Promise<Ledger> {
    return apiRequest<Ledger>("/accounting", `/ledger/${encodeURIComponent(accountCode)}`);
  },
};
