import { z } from "zod";
import { crmDateTimeSchema } from "./common.js";

export const crmViewDoctypeSchema = z.enum(["deal", "lead", "organization", "contact", "task", "note", "call_log"]);

export const crmViewTypeSchema = z.enum(["list", "kanban"]);

export const crmViewFilterOperatorSchema = z.enum(["equals", "not_equals", "contains", "gt", "lt", "empty", "not_empty"]);

export const crmViewFilterSchema = z.object({
  field: z.string().min(1).max(80),
  operator: crmViewFilterOperatorSchema,
  value: z.string().max(200).optional(),
});

export const crmViewSchema = z.object({
  id: z.string().min(1).max(64),
  doctype: crmViewDoctypeSchema,
  type: crmViewTypeSchema,
  name: z.string().min(1).max(80),
  filters: z.array(crmViewFilterSchema).default([]),
  sortBy: z.string().max(80).optional(),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  groupBy: z.string().max(80).optional(),
  isDefault: z.boolean().default(false),
  pinned: z.boolean().default(false),
  public: z.boolean().default(false),
  createdAt: crmDateTimeSchema,
});

export const createCrmViewInputSchema = z.object({
  doctype: crmViewDoctypeSchema,
  type: crmViewTypeSchema.default("list"),
  name: z.string().trim().min(1).max(80),
  filters: z.array(crmViewFilterSchema).default([]),
  sortBy: z.string().trim().max(80).optional(),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  groupBy: z.string().trim().max(80).optional(),
  isDefault: z.boolean().optional(),
  pinned: z.boolean().optional(),
  public: z.boolean().optional(),
});

export const updateCrmViewInputSchema = createCrmViewInputSchema.partial();

export const crmViewListQuerySchema = z.object({
  doctype: crmViewDoctypeSchema.optional(),
});

export const crmViewListResponseSchema = z.object({
  items: z.array(crmViewSchema),
});

export type CrmViewDoctype = z.infer<typeof crmViewDoctypeSchema>;
export type CrmViewType = z.infer<typeof crmViewTypeSchema>;
export type CrmViewFilter = z.infer<typeof crmViewFilterSchema>;
export type CrmView = z.infer<typeof crmViewSchema>;
export type CreateCrmViewInput = z.infer<typeof createCrmViewInputSchema>;
export type UpdateCrmViewInput = z.infer<typeof updateCrmViewInputSchema>;
export type CrmViewListQuery = z.infer<typeof crmViewListQuerySchema>;
export type CrmViewListResponse = z.infer<typeof crmViewListResponseSchema>;
