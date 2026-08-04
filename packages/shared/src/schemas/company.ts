import { z } from "zod";
import { emailSchema } from "./auth.js";

export const currencySchema = z
  .string()
  .trim()
  .min(3)
  .max(3)
  .regex(/^[A-Z]{3}$/);

export const timezoneSchema = z.string().trim().min(1).max(64);

export const dateFormatSchema = z.enum(["DD-MM-YYYY", "MM-DD-YYYY", "YYYY-MM-DD"]);

export const numberFormatSchema = z.enum([
  "1,000.00",
  "1.000,00",
  "1 000,00",
  "1 000.00",
]);

export const localeSettingsSchema = z.object({
  currency: currencySchema,
  timezone: timezoneSchema,
  dateFormat: dateFormatSchema,
  numberFormat: numberFormatSchema,
  country: z.string().trim().min(2).max(3),
  language: z.string().trim().min(2).max(10).default("en"),
});

export const companyProfileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  legalName: z.string().trim().max(200).optional(),
  industry: z.string().trim().min(1).max(80),
  country: z.string().trim().min(2).max(3),
  taxId: z.string().trim().max(40).optional(),
  address: z.string().trim().max(300).optional(),
});

export const tenantSettingsSchema = z.object({
  siteName: z
    .string()
    .trim()
    .min(3)
    .max(63)
    .regex(
      /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/,
      "Site name must be lowercase letters, digits and hyphens",
    ),
  locale: localeSettingsSchema,
});

export const onboardingWizardSchema = z.object({
  company: companyProfileSchema,
  regional: localeSettingsSchema,
  business: z.object({
    defaultTermOfPayment: z.string().max(80).optional(),
    enableInventory: z.boolean().default(true),
    enablePayroll: z.boolean().default(false),
    additionalCompanyFields: z.record(z.string(), z.unknown()).default({}),
  }),
  team: z
    .array(
      z.object({
        email: emailSchema,
        firstName: z.string().trim().min(1).max(80),
        lastName: z.string().trim().max(80).optional(),
        role: z.enum(["admin", "accountant", "sales", "inventory", "member"]),
      }),
    )
    .max(50),
});

export type LocaleSettings = z.infer<typeof localeSettingsSchema>;
export type CompanyProfile = z.infer<typeof companyProfileSchema>;
export type TenantSettings = z.infer<typeof tenantSettingsSchema>;
export type OnboardingWizard = z.infer<typeof onboardingWizardSchema>;
