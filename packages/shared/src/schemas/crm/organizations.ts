import { z } from "zod";
import { offsetPaginationSchema, searchSchema, sortSchema } from "../../pagination.js";
import { crmDateTimeSchema } from "./common.js";

export const organizationIndustrySchema = z.enum([
  "accounting",
  "aerospace",
  "agriculture",
  "architecture",
  "automotive",
  "biotech",
  "chemical",
  "construction",
  "consulting",
  "consumer_goods",
  "education",
  "energy",
  "engineering",
  "entertainment",
  "environmental",
  "finance",
  "food_beverage",
  "government",
  "healthcare",
  "hospitality",
  "insurance",
  "legal",
  "logistics",
  "manufacturing",
  "media",
  "mining",
  "nonprofit",
  "pharma",
  "real_estate",
  "retail",
  "software",
  "technology",
  "telecom",
  "transportation",
  "travel",
  "other",
]);

export const ORGANIZATION_INDUSTRIES = organizationIndustrySchema.options.map((value) => ({
  value,
  label: value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
})) as { value: (typeof organizationIndustrySchema.options)[number]; label: string }[];

export const organizationTerritorySchema = z.enum(["global", "national", "regional", "local"]);

export const ORGANIZATION_TERRITORIES = organizationTerritorySchema.options.map((value) => ({
  value,
  label: value.replace(/^\w/, (c) => c.toUpperCase()),
})) as { value: (typeof organizationTerritorySchema.options)[number]; label: string }[];

export const organizationStatusSchema = z.enum(["lead", "active", "inactive"]);

export const ORGANIZATION_STATUSES = [
  { value: "lead", label: "Lead" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export const organizationAddressSchema = z.object({
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  country: z.string().max(80).optional(),
});

export const organizationSchema = z.object({
  code: z.string().regex(/^ORG-\d{4}$/),
  name: z.string().min(1).max(160),
  website: z.string().max(300).optional(),
  email: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  linkedin: z.string().max(300).optional(),
  industry: organizationIndustrySchema.optional(),
  territory: organizationTerritorySchema.optional(),
  annualRevenue: z.number().nonnegative().finite().optional(),
  employeeCount: z.number().int().nonnegative().optional(),
  status: organizationStatusSchema,
  address: organizationAddressSchema.optional(),
  notes: z.string().max(4_000).optional(),
  owner: z.string().max(120).optional(),
  createdAt: crmDateTimeSchema,
  updatedAt: crmDateTimeSchema,
});

export const createOrganizationInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  website: z.string().trim().max(300).optional(),
  email: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  linkedin: z.string().trim().max(300).optional(),
  industry: organizationIndustrySchema.optional(),
  territory: organizationTerritorySchema.optional(),
  annualRevenue: z.coerce.number().nonnegative().finite().optional(),
  employeeCount: z.coerce.number().int().nonnegative().optional(),
  status: organizationStatusSchema.default("lead"),
  address: organizationAddressSchema.optional(),
  notes: z.string().trim().max(4_000).optional(),
  owner: z.string().trim().max(120).optional(),
});

export const updateOrganizationInputSchema = createOrganizationInputSchema.partial();

export const organizationListQuerySchema = offsetPaginationSchema
  .merge(searchSchema)
  .merge(sortSchema)
  .extend({
    status: organizationStatusSchema.optional(),
    industry: organizationIndustrySchema.optional(),
  });

export const organizationStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  leads: z.number().int().nonnegative(),
  contacts: z.number().int().nonnegative(),
  openDealValue: z.number().nonnegative().finite(),
});

export const organizationDetailSchema = organizationSchema.extend({
  contactCount: z.number().int().nonnegative(),
  dealCount: z.number().int().nonnegative(),
  openDealValue: z.number().nonnegative().finite(),
});

export const organizationListResponseSchema = z.object({
  items: z.array(organizationSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
  stats: organizationStatsSchema,
});

export type OrganizationIndustry = z.infer<typeof organizationIndustrySchema>;
export type OrganizationTerritory = z.infer<typeof organizationTerritorySchema>;
export type OrganizationStatus = z.infer<typeof organizationStatusSchema>;
export type OrganizationAddress = z.infer<typeof organizationAddressSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationInputSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationInputSchema>;
export type OrganizationListQuery = z.infer<typeof organizationListQuerySchema>;
export type OrganizationStats = z.infer<typeof organizationStatsSchema>;
export type OrganizationDetail = z.infer<typeof organizationDetailSchema>;
export type OrganizationListResponse = z.infer<typeof organizationListResponseSchema>;
