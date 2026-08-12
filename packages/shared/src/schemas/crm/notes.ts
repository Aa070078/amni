import { z } from "zod";
import { offsetPaginationSchema, searchSchema, sortSchema } from "../../pagination.js";
import { crmDateTimeSchema, crmReferenceTypeSchema } from "./common.js";

export const crmNoteSchema = z.object({
  code: z.string().regex(/^NTE-\d{4}$/),
  title: z.string().min(1).max(200),
  content: z.string().max(8_000),
  pinned: z.boolean().default(false),
  author: z.string().max(120).optional(),
  referenceType: crmReferenceTypeSchema.nullable().optional(),
  referenceCode: z.string().max(32).nullable().optional(),
  createdAt: crmDateTimeSchema,
  updatedAt: crmDateTimeSchema,
});

export const createCrmNoteInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().max(8_000),
  pinned: z.boolean().optional(),
  author: z.string().trim().max(120).optional(),
  referenceType: crmReferenceTypeSchema.nullable().optional(),
  referenceCode: z.string().trim().max(32).nullable().optional(),
});

export const updateCrmNoteInputSchema = createCrmNoteInputSchema.partial();

export const crmNoteListQuerySchema = offsetPaginationSchema
  .merge(searchSchema)
  .merge(sortSchema)
  .extend({
    referenceType: crmReferenceTypeSchema.optional(),
    referenceCode: z.string().optional(),
    pinned: z.enum(["true", "false"]).optional(),
  });

export const crmNoteListResponseSchema = z.object({
  items: z.array(crmNoteSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type CrmNote = z.infer<typeof crmNoteSchema>;
export type CreateCrmNoteInput = z.infer<typeof createCrmNoteInputSchema>;
export type UpdateCrmNoteInput = z.infer<typeof updateCrmNoteInputSchema>;
export type CrmNoteListQuery = z.infer<typeof crmNoteListQuerySchema>;
export type CrmNoteListResponse = z.infer<typeof crmNoteListResponseSchema>;
