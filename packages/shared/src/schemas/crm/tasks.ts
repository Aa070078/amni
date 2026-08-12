import { z } from "zod";
import { offsetPaginationSchema, searchSchema, sortSchema } from "../../pagination.js";
import { crmDateOnlySchema, crmDateTimeSchema, crmReferenceTypeSchema } from "./common.js";

export const crmTaskStatusSchema = z.enum(["backlog", "working", "review", "done", "cancelled"]);

export const CRM_TASK_STATUSES = [
  { value: "backlog", label: "Backlog" },
  { value: "working", label: "Working" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const crmTaskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const CRM_TASK_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

export const crmTaskSchema = z.object({
  code: z.string().regex(/^TSK-\d{4}$/),
  subject: z.string().min(1).max(200),
  description: z.string().max(4_000).optional(),
  status: crmTaskStatusSchema,
  priority: crmTaskPrioritySchema,
  dueDate: crmDateOnlySchema.nullable().optional(),
  assignedTo: z.string().max(120).nullable().optional(),
  referenceType: crmReferenceTypeSchema.nullable().optional(),
  referenceCode: z.string().max(32).nullable().optional(),
  completedAt: crmDateTimeSchema.nullable().optional(),
  createdAt: crmDateTimeSchema,
  updatedAt: crmDateTimeSchema,
});

export const createCrmTaskInputSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4_000).optional(),
  status: crmTaskStatusSchema.default("backlog"),
  priority: crmTaskPrioritySchema.default("low"),
  dueDate: crmDateOnlySchema.nullable().optional(),
  assignedTo: z.string().trim().max(120).nullable().optional(),
  referenceType: crmReferenceTypeSchema.nullable().optional(),
  referenceCode: z.string().trim().max(32).nullable().optional(),
});

export const updateCrmTaskInputSchema = createCrmTaskInputSchema.partial();

export const crmTaskListQuerySchema = offsetPaginationSchema
  .merge(searchSchema)
  .merge(sortSchema)
  .extend({
    status: crmTaskStatusSchema.optional(),
    priority: crmTaskPrioritySchema.optional(),
    assignedTo: z.string().optional(),
    referenceType: crmReferenceTypeSchema.optional(),
    referenceCode: z.string().optional(),
    open: z.enum(["true", "false"]).optional(),
  });

export const crmTaskBoardColumnSchema = z.object({
  status: crmTaskStatusSchema,
  label: z.string().min(1).max(32),
  count: z.number().int().nonnegative(),
  items: z.array(crmTaskSchema),
});

export const crmTaskBoardSchema = z.object({
  columns: z.array(crmTaskBoardColumnSchema),
});

export const crmTaskListResponseSchema = z.object({
  items: z.array(crmTaskSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type CrmTaskStatus = z.infer<typeof crmTaskStatusSchema>;
export type CrmTaskPriority = z.infer<typeof crmTaskPrioritySchema>;
export type CrmTask = z.infer<typeof crmTaskSchema>;
export type CreateCrmTaskInput = z.infer<typeof createCrmTaskInputSchema>;
export type UpdateCrmTaskInput = z.infer<typeof updateCrmTaskInputSchema>;
export type CrmTaskListQuery = z.infer<typeof crmTaskListQuerySchema>;
export type CrmTaskBoardColumn = z.infer<typeof crmTaskBoardColumnSchema>;
export type CrmTaskBoard = z.infer<typeof crmTaskBoardSchema>;
export type CrmTaskListResponse = z.infer<typeof crmTaskListResponseSchema>;
