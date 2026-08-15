import { z } from "zod";
import { crmContactAttachmentSchema, crmDateTimeSchema, crmReferenceTypeSchema } from "./common.js";

export const crmActivityKindSchema = z.enum([
  "comment",
  "note",
  "call",
  "whatsapp",
  "email",
  "status_change",
  "task",
  "event",
  "system",
]);

export const CRM_ACTIVITY_KINDS = [
  { value: "comment", label: "Comment" },
  { value: "note", label: "Note" },
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "status_change", label: "Status change" },
  { value: "task", label: "Task" },
  { value: "event", label: "Event" },
  { value: "system", label: "System" },
] as const;

export const crmActivitySchema = z.object({
  id: z.string().min(1).max(64),
  referenceType: crmReferenceTypeSchema,
  referenceCode: z.string().min(1).max(32),
  kind: crmActivityKindSchema,
  content: z.string().max(4_000).optional(),
  author: z.string().max(120).optional(),
  mentions: z.array(z.string().max(120)).default([]),
  attachments: z.array(crmContactAttachmentSchema).default([]),
  createdAt: crmDateTimeSchema,
});

export const createCrmCommentInputSchema = z.object({
  referenceType: crmReferenceTypeSchema,
  referenceCode: z.string().trim().min(1).max(32),
  content: z.string().trim().min(1).max(4_000),
  mentions: z.array(z.string().trim().max(120)).default([]),
  attachments: z.array(crmContactAttachmentSchema).default([]),
});

export const createCrmStatusActivityInputSchema = z.object({
  referenceType: crmReferenceTypeSchema,
  referenceCode: z.string().trim().min(1).max(32),
  from: z.string().max(80).optional(),
  to: z.string().min(1).max(80),
  author: z.string().max(120).optional(),
});

export const crmActivityListQuerySchema = z.object({
  referenceType: crmReferenceTypeSchema.optional(),
  referenceCode: z.string().optional(),
  kind: crmActivityKindSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const crmActivityListResponseSchema = z.object({
  items: z.array(crmActivitySchema),
  total: z.number().int().nonnegative(),
});

export type CrmActivityKind = z.infer<typeof crmActivityKindSchema>;
export type CrmActivity = z.infer<typeof crmActivitySchema>;
export type CreateCrmCommentInput = z.infer<typeof createCrmCommentInputSchema>;
export type CreateCrmStatusActivityInput = z.infer<typeof createCrmStatusActivityInputSchema>;
export type CrmActivityListQuery = z.infer<typeof crmActivityListQuerySchema>;
export type CrmActivityListResponse = z.infer<typeof crmActivityListResponseSchema>;
