import { z } from "zod";
import { crmDateTimeSchema, crmReferenceTypeSchema } from "./common.js";
import { crmTelephonyProviderSchema } from "./call-logs.js";
import { crmWhatsappConfigSchema } from "./whatsapp.js";

export const crmPipelineStageSchema = z.object({
  value: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
  color: z.string().max(30),
  probability: z.number().int().min(0).max(100),
});

export const crmLeadStatusSchema = z.object({
  value: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
  color: z.string().max(30),
});

export const crmEmailProviderSchema = z.enum(["frappe_mail", "imap", "smtp"]);

export const crmEmailAccountSchema = z.object({
  name: z.string().max(120),
  email: z.string().max(200),
  provider: crmEmailProviderSchema,
  host: z.string().max(200).optional(),
  port: z.number().int().positive().nullable().optional(),
  useSSL: z.boolean().default(true),
  enabled: z.boolean().default(false),
});

export const crmTelephonyConfigSchema = z.object({
  provider: crmTelephonyProviderSchema,
  enabled: z.boolean().default(false),
  number: z.string().max(40).default(""),
  apiKeyMasked: z.string().max(40).default(""),
});

export const crmSettingsSchema = z.object({
  brandName: z.string().max(120).default("Amni CRM"),
  defaultOwner: z.string().max(120).default(""),
  pipelineStages: z.array(crmPipelineStageSchema).default([]),
  leadStatuses: z.array(crmLeadStatusSchema).default([]),
  whatsapp: crmWhatsappConfigSchema,
  telephony: crmTelephonyConfigSchema,
  emailAccount: crmEmailAccountSchema,
  updatedAt: crmDateTimeSchema,
});

export const updateCrmSettingsInputSchema = z.object({
  brandName: z.string().trim().max(120).optional(),
  defaultOwner: z.string().trim().max(120).optional(),
  pipelineStages: z.array(crmPipelineStageSchema).optional(),
  leadStatuses: z.array(crmLeadStatusSchema).optional(),
  whatsapp: crmWhatsappConfigSchema.partial().optional(),
  telephony: crmTelephonyConfigSchema.partial().optional(),
  emailAccount: crmEmailAccountSchema.partial().optional(),
});

export const crmDialInputSchema = z.object({
  phoneNumber: z.string().trim().min(1).max(40),
  referenceType: crmReferenceTypeSchema.nullable().optional(),
  referenceCode: z.string().trim().max(32).nullable().optional(),
});

export const crmDialResultSchema = z.object({
  callId: z.string().min(1).max(64),
  provider: crmTelephonyProviderSchema,
  status: z.enum(["ringing", "in_progress"]),
  message: z.string(),
});

export type CrmPipelineStage = z.infer<typeof crmPipelineStageSchema>;
export type CrmLeadStatus = z.infer<typeof crmLeadStatusSchema>;
export type CrmEmailProvider = z.infer<typeof crmEmailProviderSchema>;
export type CrmEmailAccount = z.infer<typeof crmEmailAccountSchema>;
export type CrmTelephonyConfig = z.infer<typeof crmTelephonyConfigSchema>;
export type CrmSettings = z.infer<typeof crmSettingsSchema>;
export type UpdateCrmSettingsInput = z.infer<typeof updateCrmSettingsInputSchema>;
export type CrmDialInput = z.infer<typeof crmDialInputSchema>;
export type CrmDialResult = z.infer<typeof crmDialResultSchema>;
