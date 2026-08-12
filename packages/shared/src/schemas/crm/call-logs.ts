import { z } from "zod";
import { offsetPaginationSchema, searchSchema, sortSchema } from "../../pagination.js";
import { crmDateTimeSchema, crmReferenceTypeSchema } from "./common.js";

export const crmCallDirectionSchema = z.enum(["inbound", "outbound"]);

export const crmCallStatusSchema = z.enum([
  "completed",
  "missed",
  "in_progress",
  "failed",
  "cancelled",
  "busy",
  "ringing",
]);

export const CRM_CALL_STATUSES = [
  { value: "completed", label: "Completed" },
  { value: "missed", label: "Missed" },
  { value: "in_progress", label: "In progress" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "busy", label: "Busy" },
  { value: "ringing", label: "Ringing" },
] as const;

export const crmTelephonyProviderSchema = z.enum(["twilio", "exotel", "internal"]);

export const crmCallLogSchema = z.object({
  id: z.string().min(1).max(64),
  direction: crmCallDirectionSchema,
  status: crmCallStatusSchema,
  phoneNumber: z.string().min(1).max(40),
  agent: z.string().max(120).optional(),
  provider: crmTelephonyProviderSchema,
  startTime: crmDateTimeSchema,
  endTime: crmDateTimeSchema.nullable().optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  recordingUrl: z.string().max(1_000).optional(),
  referenceType: crmReferenceTypeSchema.nullable().optional(),
  referenceCode: z.string().max(32).nullable().optional(),
  notes: z.string().max(2_000).optional(),
  createdAt: crmDateTimeSchema,
});

export const createCrmCallLogInputSchema = z.object({
  direction: crmCallDirectionSchema,
  status: crmCallStatusSchema,
  phoneNumber: z.string().trim().min(1).max(40),
  agent: z.string().trim().max(120).optional(),
  provider: crmTelephonyProviderSchema.default("internal"),
  endTime: crmDateTimeSchema.nullable().optional(),
  durationSeconds: z.coerce.number().int().nonnegative().optional(),
  recordingUrl: z.string().trim().max(1_000).optional(),
  referenceType: crmReferenceTypeSchema.nullable().optional(),
  referenceCode: z.string().trim().max(32).nullable().optional(),
  notes: z.string().trim().max(2_000).optional(),
});

export const updateCrmCallLogInputSchema = createCrmCallLogInputSchema.partial();

export const crmCallLogListQuerySchema = offsetPaginationSchema
  .merge(searchSchema)
  .merge(sortSchema)
  .extend({
    direction: crmCallDirectionSchema.optional(),
    status: crmCallStatusSchema.optional(),
    agent: z.string().optional(),
    referenceType: crmReferenceTypeSchema.optional(),
    referenceCode: z.string().optional(),
  });

export const crmCallLogSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  missed: z.number().int().nonnegative(),
  incoming: z.number().int().nonnegative(),
  outgoing: z.number().int().nonnegative(),
  totalDurationSeconds: z.number().int().nonnegative(),
});

export const crmCallLogListResponseSchema = z.object({
  items: z.array(crmCallLogSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
  summary: crmCallLogSummarySchema,
});

export type CrmCallDirection = z.infer<typeof crmCallDirectionSchema>;
export type CrmCallStatus = z.infer<typeof crmCallStatusSchema>;
export type CrmTelephonyProvider = z.infer<typeof crmTelephonyProviderSchema>;
export type CrmCallLog = z.infer<typeof crmCallLogSchema>;
export type CreateCrmCallLogInput = z.infer<typeof createCrmCallLogInputSchema>;
export type UpdateCrmCallLogInput = z.infer<typeof updateCrmCallLogInputSchema>;
export type CrmCallLogListQuery = z.infer<typeof crmCallLogListQuerySchema>;
export type CrmCallLogSummary = z.infer<typeof crmCallLogSummarySchema>;
export type CrmCallLogListResponse = z.infer<typeof crmCallLogListResponseSchema>;
