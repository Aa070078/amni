import type { AdminSummary, AdminTenantDetail, AdminTenantListQuery, AdminTenantListResponse } from "@amni/shared";

import { apiRequest, toQueryString } from "./client";

export const adminClient = {
  summary(): Promise<AdminSummary> {
    return apiRequest<AdminSummary>("/admin", "/summary");
  },
  tenants(query: AdminTenantListQuery): Promise<AdminTenantListResponse> {
    return apiRequest<AdminTenantListResponse>("/admin", `/tenants${toQueryString(query)}`);
  },
  tenant(id: string): Promise<AdminTenantDetail> {
    return apiRequest<AdminTenantDetail>("/admin", `/tenants/${encodeURIComponent(id)}`);
  },
};
