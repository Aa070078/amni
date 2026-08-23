import type {
  AdminSummary,
  AdminTenantDetail,
  AdminTenantListQuery,
  AdminTenantListResponse,
  AdminTenantSummary,
  AdminUserDetail,
  AdminUserListQuery,
  AdminUserListResponse,
  AdminUserSummary,
  PlanTier,
} from "@amni/shared";

import { apiRequest, toQueryString } from "./client";

export const adminClient = {
  // ─── Overview ──────────────────────────────────────────────────────

  summary(): Promise<AdminSummary> {
    return apiRequest<AdminSummary>("/admin", "/summary");
  },

  // ─── Tenants ───────────────────────────────────────────────────────

  tenants(query: AdminTenantListQuery): Promise<AdminTenantListResponse> {
    return apiRequest<AdminTenantListResponse>("/admin", `/tenants${toQueryString(query)}`);
  },
  tenant(id: string): Promise<AdminTenantDetail> {
    return apiRequest<AdminTenantDetail>("/admin", `/tenants/${encodeURIComponent(id)}`);
  },
  suspendTenant(id: string): Promise<AdminTenantSummary> {
    return apiRequest<AdminTenantSummary>("/admin", `/tenants/${encodeURIComponent(id)}/suspend`, { method: "POST" });
  },
  resumeTenant(id: string): Promise<AdminTenantSummary> {
    return apiRequest<AdminTenantSummary>("/admin", `/tenants/${encodeURIComponent(id)}/resume`, { method: "POST" });
  },
  archiveTenant(id: string): Promise<AdminTenantSummary> {
    return apiRequest<AdminTenantSummary>("/admin", `/tenants/${encodeURIComponent(id)}/archive`, { method: "POST" });
  },
  changeTenantPlan(id: string, planTier: PlanTier): Promise<AdminTenantSummary> {
    return apiRequest<AdminTenantSummary>("/admin", `/tenants/${encodeURIComponent(id)}/plan`, {
      method: "PATCH",
      body: { planTier },
    });
  },

  // ─── Users ─────────────────────────────────────────────────────────

  users(query: AdminUserListQuery): Promise<AdminUserListResponse> {
    return apiRequest<AdminUserListResponse>("/admin", `/users${toQueryString(query)}`);
  },
  user(id: string): Promise<AdminUserDetail> {
    return apiRequest<AdminUserDetail>("/admin", `/users/${encodeURIComponent(id)}`);
  },
  suspendUser(id: string): Promise<AdminUserSummary> {
    return apiRequest<AdminUserSummary>("/admin", `/users/${encodeURIComponent(id)}/suspend`, { method: "POST" });
  },
  activateUser(id: string): Promise<AdminUserSummary> {
    return apiRequest<AdminUserSummary>("/admin", `/users/${encodeURIComponent(id)}/activate`, { method: "POST" });
  },
  promoteUser(id: string): Promise<AdminUserSummary> {
    return apiRequest<AdminUserSummary>("/admin", `/users/${encodeURIComponent(id)}/promote`, { method: "POST" });
  },
  demoteUser(id: string): Promise<AdminUserSummary> {
    return apiRequest<AdminUserSummary>("/admin", `/users/${encodeURIComponent(id)}/demote`, { method: "POST" });
  },
};
