import { z } from "zod";
import { emailSchema } from "./auth.js";
import { offsetPaginationSchema, searchSchema, sortSchema } from "../pagination.js";

export const contactStatusSchema = z.enum(["active", "inactive"]);

export const CONTACT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export const contactSchema = z.object({
  code: z.string().regex(/^CON-\d{4}$/),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional(),
  email: emailSchema.optional(),
  phone: z.string().max(40).optional(),
  jobTitle: z.string().max(120).optional(),
  department: z.string().max(80).optional(),
  company: z.string().max(160).optional(),
  address: z.string().max(300).optional(),
  notes: z.string().max(2_000).optional(),
  status: contactStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createContactInputSchema = contactSchema.omit({ code: true, createdAt: true, updatedAt: true }).partial();

export const updateContactInputSchema = createContactInputSchema;

export const contactListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: contactStatusSchema.optional(),
});

export const contactListResponseSchema = z.object({
  items: z.array(contactSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type ContactStatus = z.infer<typeof contactStatusSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type CreateContactInput = z.infer<typeof createContactInputSchema>;
export type UpdateContactInput = z.infer<typeof updateContactInputSchema>;
export type ContactListQuery = z.infer<typeof contactListQuerySchema>;
export type ContactListResponse = z.infer<typeof contactListResponseSchema>;
