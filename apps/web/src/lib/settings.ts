import type {
  BillingInput,
  CompanySettings,
  CurrentPlan,
  Integration,
  InviteMemberInput,
  ProfileSettings,
  SettingsRole,
  TeamMember,
  UpdateCompanySettingsInput,
  UpdateMemberInput,
  UpdateProfileInput,
} from "@amni/shared";

import { apiRequest } from "./client";

export const settingsClient = {
  company(): Promise<CompanySettings> {
    return apiRequest<CompanySettings>("/settings", "/company");
  },
  updateCompany(input: UpdateCompanySettingsInput): Promise<CompanySettings> {
    return apiRequest<CompanySettings>("/settings", "/company", { method: "PATCH", body: input });
  },
  team(): Promise<TeamMember[]> {
    return apiRequest<TeamMember[]>("/settings", "/team");
  },
  invite(input: InviteMemberInput): Promise<TeamMember> {
    return apiRequest<TeamMember>("/settings", "/team/invites", { method: "POST", body: input });
  },
  updateMember(id: string, input: UpdateMemberInput): Promise<TeamMember> {
    return apiRequest<TeamMember>("/settings", `/team/${encodeURIComponent(id)}`, { method: "PATCH", body: input });
  },
  roles(): Promise<SettingsRole[]> {
    return apiRequest<SettingsRole[]>("/settings", "/roles");
  },
  plan(): Promise<CurrentPlan> {
    return apiRequest<CurrentPlan>("/settings", "/plan");
  },
  changeBilling(input: BillingInput): Promise<CurrentPlan> {
    return apiRequest<CurrentPlan>("/settings", "/plan/billing", { method: "PATCH", body: input });
  },
  integrations(): Promise<Integration[]> {
    return apiRequest<Integration[]>("/settings", "/integrations");
  },
  toggleIntegration(key: string): Promise<Integration> {
    return apiRequest<Integration>("/settings", `/integrations/${encodeURIComponent(key)}`, { method: "PATCH" });
  },
  profile(): Promise<ProfileSettings> {
    return apiRequest<ProfileSettings>("/settings", "/profile");
  },
  updateProfile(input: UpdateProfileInput): Promise<ProfileSettings> {
    return apiRequest<ProfileSettings>("/settings", "/profile", { method: "PATCH", body: input });
  },
};
