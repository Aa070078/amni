import { z } from "zod";
import { offsetPaginationSchema, searchSchema, sortSchema } from "../../pagination.js";
import { crmDateTimeSchema } from "./common.js";

export const crmContactSchema = z.object({
  code: z.string().regex(/^CC-\d{4}$/),
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional(),
  email: z.string().max(200).optional(),
  mobileNo: z.string().max(40).optional(),
  jobTitle: z.string().max(120).optional(),
  department: z.string().max(80).optional(),
  company: z.string().max(160).optional(),
  organizationCode: z.string().regex(/^ORG-\d{4}$/).nullable().optional(),
  isPrimary: z.boolean().default(false),
  address: z.string().max(300).optional(),
  notes: z.string().max(2_000).optional(),
  createdAt: crmDateTimeSchema,
  updatedAt: crmDateTimeSchema,
});

export const createCrmContactInputSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional(),
  email: z.string().trim().max(200).optional(),
  mobileNo: z.string().trim().max(40).optional(),
  jobTitle: z.string().trim().max(120).optional(),
  department: z.string().trim().max(80).optional(),
  company: z.string().trim().max(160).optional(),
  organizationCode: z.string().regex(/^ORG-\d{4}$/).nullable().optional(),
  isPrimary: z.boolean().optional(),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2_000).optional(),
});

export const updateCrmContactInputSchema = createCrmContactInputSchema.partial();

export const crmContactListQuerySchema = offsetPaginationSchema
  .merge(searchSchema)
  .merge(sortSchema)
  .extend({
    organizationCode: z.string().regex(/^ORG-\d{4}$/).optional(),
  });

export const crmContactListResponseSchema = z.object({
  items: z.array(crmContactSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type CrmContact = z.infer<typeof crmContactSchema>;
export type CreateCrmContactInput = z.infer<typeof createCrmContactInputSchema>;
export type UpdateCrmContactInput = z.infer<typeof updateCrmContactInputSchema>;
export type CrmContactListQuery = z.infer<typeof crmContactListQuerySchema>;
export type CrmContactListResponse = z.infer<typeof crmContactListResponseSchema>;
