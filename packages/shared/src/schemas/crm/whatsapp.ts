import { z } from "zod";
import { crmDateTimeSchema, crmReferenceTypeSchema } from "./common.js";

export const crmWhatsappStatusSchema = z.enum(["queued", "sent", "failed"]);

export const crmWhatsappMessageSchema = z.object({
  id: z.string().min(1).max(64),
  to: z.string().min(1).max(40),
  message: z.string().min(1).max(4_000),
  status: crmWhatsappStatusSchema,
  referenceType: crmReferenceTypeSchema.nullable().optional(),
  referenceCode: z.string().max(32).nullable().optional(),
  sentAt: crmDateTimeSchema,
});

export const sendCrmWhatsappInputSchema = z.object({
  to: z.string().trim().min(1).max(40),
  message: z.string().trim().min(1).max(4_000),
  referenceType: crmReferenceTypeSchema.nullable().optional(),
  referenceCode: z.string().trim().max(32).nullable().optional(),
});

export const crmWhatsappConfigSchema = z.object({
  enabled: z.boolean().default(false),
  accountName: z.string().max(120).default(""),
  defaultMessage: z.string().max(1_000).default(""),
});

export const crmWhatsappResponseSchema = z.object({
  message: crmWhatsappMessageSchema,
});

export const crmWhatsappHistoryQuerySchema = z.object({
  referenceType: crmReferenceTypeSchema.optional(),
  referenceCode: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const crmWhatsappHistoryResponseSchema = z.object({
  items: z.array(crmWhatsappMessageSchema),
});

export type CrmWhatsappStatus = z.infer<typeof crmWhatsappStatusSchema>;
export type CrmWhatsappMessage = z.infer<typeof crmWhatsappMessageSchema>;
export type SendCrmWhatsappInput = z.infer<typeof sendCrmWhatsappInputSchema>;
export type CrmWhatsappConfig = z.infer<typeof crmWhatsappConfigSchema>;
export type CrmWhatsappResponse = z.infer<typeof crmWhatsappResponseSchema>;
export type CrmWhatsappHistoryQuery = z.infer<typeof crmWhatsappHistoryQuerySchema>;
export type CrmWhatsappHistoryResponse = z.infer<typeof crmWhatsappHistoryResponseSchema>;
