import type {
  CapTableRow,
  CreateRoundInput,
  CreateShareClassInput,
  CreateShareholderInput,
  EquityOverview,
  Round,
  RoundListQuery,
  RoundListResponse,
  RoundStatus,
  ShareClass,
  ShareClassListQuery,
  ShareClassListResponse,
  ShareClassStatus,
  Shareholder,
  ShareholderListQuery,
  ShareholderListResponse,
} from "@amni/shared";
import { apiRequest, toQueryString } from "./client";

export const equityClient = {
  overview(): Promise<EquityOverview> {
    return apiRequest<EquityOverview>("/equity", "/overview");
  },
  capTable(): Promise<CapTableRow[]> {
    return apiRequest<CapTableRow[]>("/equity", "/cap-table");
  },
  listShareholders(query: Partial<ShareholderListQuery> = {}): Promise<ShareholderListResponse> {
    const { page, pageSize, q, sortBy, sortDir, type } = query;
    return apiRequest<ShareholderListResponse>("/equity", toQueryString({ page, pageSize, q, sortBy, sortDir, type }));
  },
  shareholderDetail(code: string): Promise<Shareholder> {
    return apiRequest<Shareholder>("/equity", `/shareholders/${encodeURIComponent(code)}`);
  },
  createShareholder(input: CreateShareholderInput): Promise<Shareholder> {
    return apiRequest<Shareholder>("/equity", "/shareholders", { method: "POST", body: input });
  },
  removeShareholder(code: string): Promise<void> {
    return apiRequest<void>("/equity", `/shareholders/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
  listClasses(query: Partial<ShareClassListQuery> = {}): Promise<ShareClassListResponse> {
    const { page, pageSize, q, sortBy, sortDir, status } = query;
    return apiRequest<ShareClassListResponse>("/equity", toQueryString({ page, pageSize, q, sortBy, sortDir, status }));
  },
  classDetail(code: string): Promise<ShareClass> {
    return apiRequest<ShareClass>("/equity", `/classes/${encodeURIComponent(code)}`);
  },
  createClass(input: CreateShareClassInput): Promise<ShareClass> {
    return apiRequest<ShareClass>("/equity", "/classes", { method: "POST", body: input });
  },
  changeClassStatus(code: string, status: ShareClassStatus): Promise<ShareClass> {
    return apiRequest<ShareClass>("/equity", `/classes/${encodeURIComponent(code)}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
  removeClass(code: string): Promise<void> {
    return apiRequest<void>("/equity", `/classes/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
  listRounds(query: Partial<RoundListQuery> = {}): Promise<RoundListResponse> {
    const { page, pageSize, q, sortBy, sortDir, status } = query;
    return apiRequest<RoundListResponse>("/equity", toQueryString({ page, pageSize, q, sortBy, sortDir, status }));
  },
  roundDetail(code: string): Promise<Round> {
    return apiRequest<Round>("/equity", `/rounds/${encodeURIComponent(code)}`);
  },
  createRound(input: CreateRoundInput): Promise<Round> {
    return apiRequest<Round>("/equity", "/rounds", { method: "POST", body: input });
  },
  changeRoundStatus(code: string, status: RoundStatus): Promise<Round> {
    return apiRequest<Round>("/equity", `/rounds/${encodeURIComponent(code)}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
  removeRound(code: string): Promise<void> {
    return apiRequest<void>("/equity", `/rounds/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
};
