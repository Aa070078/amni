import type {
  CreateSignRequestInput,
  CreateSignTemplateInput,
  SignAuditListQuery,
  SignAuditResponse,
  SignOverview,
  SignRequest,
  SignRequestListQuery,
  SignRequestListResponse,
  SignRequestStatus,
  SignTemplate,
  SignTemplateListQuery,
  SignTemplateListResponse,
  SignTemplateStatus,
  DeclineSignRequestInput,
} from "@amni/shared";
import { apiRequest, toQueryString } from "./client";

export const signClient = {
  overview(): Promise<SignOverview> {
    return apiRequest<SignOverview>("/sign", "/overview");
  },
  listRequests(query: Partial<SignRequestListQuery> = {}): Promise<SignRequestListResponse> {
    const { page, pageSize, q, sortBy, sortDir, status } = query;
    return apiRequest<SignRequestListResponse>(
      "/sign",
      `/requests${toQueryString({ page, pageSize, q, sortBy, sortDir, status })}`,
    );
  },
  requestDetail(code: string): Promise<SignRequest> {
    return apiRequest<SignRequest>("/sign", `/requests/${encodeURIComponent(code)}`);
  },
  createRequest(input: CreateSignRequestInput): Promise<SignRequest> {
    return apiRequest<SignRequest>("/sign", "/requests", { method: "POST", body: input });
  },
  changeRequestStatus(code: string, status: SignRequestStatus): Promise<SignRequest> {
    return apiRequest<SignRequest>("/sign", `/requests/${encodeURIComponent(code)}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
  declineRequest(code: string, input: DeclineSignRequestInput): Promise<SignRequest> {
    return apiRequest<SignRequest>("/sign", `/requests/${encodeURIComponent(code)}/decline`, {
      method: "PATCH",
      body: input,
    });
  },
  markSignerSigned(code: string, signerCode: string): Promise<SignRequest> {
    return apiRequest<SignRequest>("/sign", `/requests/${encodeURIComponent(code)}/signers/${encodeURIComponent(signerCode)}/sign`, {
      method: "PATCH",
    });
  },
  removeRequest(code: string): Promise<void> {
    return apiRequest<void>("/sign", `/requests/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
  listTemplates(query: Partial<SignTemplateListQuery> = {}): Promise<SignTemplateListResponse> {
    const { page, pageSize, q, sortBy, sortDir, status } = query;
    return apiRequest<SignTemplateListResponse>(
      "/sign",
      `/templates${toQueryString({ page, pageSize, q, sortBy, sortDir, status })}`,
    );
  },
  templateDetail(code: string): Promise<SignTemplate> {
    return apiRequest<SignTemplate>("/sign", `/templates/${encodeURIComponent(code)}`);
  },
  createTemplate(input: CreateSignTemplateInput): Promise<SignTemplate> {
    return apiRequest<SignTemplate>("/sign", "/templates", { method: "POST", body: input });
  },
  changeTemplateStatus(code: string, status: SignTemplateStatus): Promise<SignTemplate> {
    return apiRequest<SignTemplate>("/sign", `/templates/${encodeURIComponent(code)}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
  removeTemplate(code: string): Promise<void> {
    return apiRequest<void>("/sign", `/templates/${encodeURIComponent(code)}`, { method: "DELETE" });
  },
  listAudit(query: Partial<SignAuditListQuery> = {}): Promise<SignAuditResponse> {
    const { page, pageSize, q } = query;
    return apiRequest<SignAuditResponse>("/sign", `/audit${toQueryString({ page, pageSize, q })}`);
  },
};
