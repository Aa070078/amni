import { z } from "zod";
import { crmDateTimeSchema, crmReferenceTypeSchema } from "./common.js";

export const crmEventTypeSchema = z.enum(["call", "meeting", "follow_up", "task", "reminder", "other"]);

export const CRM_EVENT_TYPES = [
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "follow_up", label: "Follow up" },
  { value: "task", label: "Task" },
  { value: "reminder", label: "Reminder" },
  { value: "other", label: "Other" },
] as const;

export const crmEventSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  type: crmEventTypeSchema,
  startsAt: crmDateTimeSchema,
  endsAt: crmDateTimeSchema.nullable().optional(),
  description: z.string().max(2_000).optional(),
  participants: z
    .array(z.object({ name: z.string().max(120).optional(), email: z.string().max(200).optional() }))
    .default([]),
  referenceType: crmReferenceTypeSchema.nullable().optional(),
  referenceCode: z.string().max(32).nullable().optional(),
  reminderBeforeMinutes: z.number().int().nonnegative().nullable().optional(),
  createdAt: crmDateTimeSchema,
});

export const createCrmEventInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: crmEventTypeSchema.default("other"),
  startsAt: crmDateTimeSchema,
  endsAt: crmDateTimeSchema.nullable().optional(),
  description: z.string().trim().max(2_000).optional(),
  participants: z
    .array(z.object({ name: z.string().trim().max(120).optional(), email: z.string().trim().max(200).optional() }))
    .default([]),
  referenceType: crmReferenceTypeSchema.nullable().optional(),
  referenceCode: z.string().trim().max(32).nullable().optional(),
  reminderBeforeMinutes: z.coerce.number().int().nonnegative().nullable().optional(),
});

export const updateCrmEventInputSchema = createCrmEventInputSchema.partial();

export const crmEventListQuerySchema = z.object({
  from: crmDateTimeSchema.optional(),
  to: crmDateTimeSchema.optional(),
  type: crmEventTypeSchema.optional(),
  referenceType: crmReferenceTypeSchema.optional(),
  referenceCode: z.string().optional(),
});

export const crmEventListResponseSchema = z.object({
  items: z.array(crmEventSchema),
});

export type CrmEventType = z.infer<typeof crmEventTypeSchema>;
export type CrmEvent = z.infer<typeof crmEventSchema>;
export type CreateCrmEventInput = z.infer<typeof createCrmEventInputSchema>;
export type UpdateCrmEventInput = z.infer<typeof updateCrmEventInputSchema>;
export type CrmEventListQuery = z.infer<typeof crmEventListQuerySchema>;
export type CrmEventListResponse = z.infer<typeof crmEventListResponseSchema>;
