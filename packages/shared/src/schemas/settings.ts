import { z } from "zod";
import { currencySchema, localeSettingsSchema, timezoneSchema } from "./company.js";
import { emailSchema } from "./auth.js";

export const companySettingsSchema = z.object({
  name: z.string().min(1).max(120),
  legalName: z.string().max(200).optional(),
  slug: z.string().min(1).max(100),
  industry: z.string().min(1).max(80),
  country: z.string().min(2).max(3),
  taxId: z.string().max(40).optional(),
  address: z.string().max(300).optional(),
  email: emailSchema.optional(),
  phone: z.string().max(40).optional(),
  website: z.string().max(200).optional(),
  currency: currencySchema.default("USD"),
  fiscalYearStart: z.string().max(10).optional(),
  timezone: timezoneSchema,
  createdAt: z.string().datetime(),
});

export const updateCompanySettingsInputSchema = companySettingsSchema
  .omit({ slug: true, createdAt: true })
  .partial();

export type UpdateCompanySettingsInput = z.infer<typeof updateCompanySettingsInputSchema>;
export type CompanySettings = z.infer<typeof companySettingsSchema>;

export const teamRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER", "ACCOUNTANT", "SALES", "INVENTORY"]);

export const TEAM_ROLES = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "SALES", label: "Sales" },
  { value: "INVENTORY", label: "Inventory" },
  { value: "MEMBER", label: "Member" },
] as const;

export const teamMemberSchema = z.object({
  id: z.string().min(1).max(64),
  email: emailSchema,
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional(),
  role: teamRoleSchema,
  status: z.enum(["active", "invited", "disabled"]),
  lastActive: z.string().datetime().nullable().optional(),
  joinedAt: z.string().datetime(),
});

export const inviteMemberInputSchema = z.object({
  email: emailSchema,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional(),
  role: teamRoleSchema,
});

export const updateMemberInputSchema = z.object({
  role: teamRoleSchema.optional(),
  status: z.enum(["active", "invited", "disabled"]).optional(),
});

export type TeamRole = z.infer<typeof teamRoleSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberInputSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberInputSchema>;

export const settingsRoleSchema = z.object({
  key: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  description: z.string().max(200).optional(),
  members: z.number().int().nonnegative(),
  permissions: z.array(z.string().min(1).max(80)),
});

export type SettingsRole = z.infer<typeof settingsRoleSchema>;

export const planSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(80),
  priceMonthly: z.number().nonnegative().finite(),
  priceYearly: z.number().nonnegative().finite(),
  seats: z.number().int().positive(),
  storageGb: z.number().int().positive(),
  features: z.array(z.string().min(1).max(120)),
});

export const currentPlanSchema = z.object({
  plan: planSchema,
  billingPeriod: z.enum(["monthly", "yearly"]),
  renewsAt: z.string().datetime(),
  seatsUsed: z.number().int().nonnegative(),
  status: z.enum(["active", "trial", "past_due", "cancelled"]),
  nextPayment: z.object({
    date: z.string().datetime(),
    amount: z.number().nonnegative().finite(),
    currency: currencySchema,
  }).optional(),
  invoices: z.array(
    z.object({
      code: z.string().min(1).max(40),
      date: z.string().datetime(),
      amount: z.number().nonnegative().finite(),
      currency: currencySchema,
      status: z.enum(["paid", "pending", "failed"]),
    }),
  ).default([]),
});

export const billingInputSchema = z.object({
  billingPeriod: z.enum(["monthly", "yearly"]),
});

export type Plan = z.infer<typeof planSchema>;
export type CurrentPlan = z.infer<typeof currentPlanSchema>;
export type BillingInput = z.infer<typeof billingInputSchema>;

export const integrationSchema = z.object({
  key: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  description: z.string().max(200).optional(),
  category: z.enum(["banking", "payments", "commerce", "productivity", "data"]),
  connected: z.boolean(),
  status: z.enum(["connected", "available", "error"]).optional(),
  account: z.string().max(120).optional(),
});

export type Integration = z.infer<typeof integrationSchema>;

export const profileSettingsSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional(),
  avatarUrl: z.string().max(500).nullable().optional(),
  jobTitle: z.string().max(120).optional(),
  locale: localeSettingsSchema.optional(),
});

export const updateProfileInputSchema = profileSettingsSchema
  .omit({ email: true })
  .partial();

export type ProfileSettings = z.infer<typeof profileSettingsSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
