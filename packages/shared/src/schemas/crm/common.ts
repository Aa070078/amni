import { z } from "zod";

export const crmReferenceTypeSchema = z.enum(["deal", "lead", "organization", "contact", "task", "note"]);

export const crmDateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const crmDateTimeSchema = z.string().datetime();

export const crmContactAttachmentSchema = z.object({
  name: z.string().min(1).max(160),
  url: z.string().max(1_000),
});

export type CrmReferenceType = z.infer<typeof crmReferenceTypeSchema>;
export type CrmDateOnly = z.infer<typeof crmDateOnlySchema>;
export type CrmContactAttachment = z.infer<typeof crmContactAttachmentSchema>;
