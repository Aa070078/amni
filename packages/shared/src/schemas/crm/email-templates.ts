import { z } from "zod";
import { crmDateTimeSchema, crmReferenceTypeSchema } from "./common.js";

export const crmEmailTemplateSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(10_000),
  referenceType: crmReferenceTypeSchema.nullable().optional(),
  createdAt: crmDateTimeSchema,
});

export const createCrmEmailTemplateInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(10_000),
  referenceType: crmReferenceTypeSchema.nullable().optional(),
});

export const updateCrmEmailTemplateInputSchema = createCrmEmailTemplateInputSchema.partial();

export const crmEmailTemplateListResponseSchema = z.object({
  items: z.array(crmEmailTemplateSchema),
});

export const crmEmailTemplatePreviewInputSchema = z.object({
  templateId: z.string().min(1).max(64),
  variables: z.record(z.string().max(300)).default({}),
});

export const crmEmailTemplatePreviewSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export type CrmEmailTemplate = z.infer<typeof crmEmailTemplateSchema>;
export type CreateCrmEmailTemplateInput = z.infer<typeof createCrmEmailTemplateInputSchema>;
export type UpdateCrmEmailTemplateInput = z.infer<typeof updateCrmEmailTemplateInputSchema>;
export type CrmEmailTemplateListResponse = z.infer<typeof crmEmailTemplateListResponseSchema>;
export type CrmEmailTemplatePreviewInput = z.infer<typeof crmEmailTemplatePreviewInputSchema>;
export type CrmEmailTemplatePreview = z.infer<typeof crmEmailTemplatePreviewSchema>;
