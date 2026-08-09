import { z } from "zod";
import { pageSchema } from "../pagination.js";
import { emailSchema } from "./auth.js";

export const contactStatusSchema = z.enum(["active", "inactive"]);

export const contactSummarySchema = z.object({
  id: z.string().min(1).max(64),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: emailSchema.optional(),
  phone: z.string().max(40).optional(),
  title: z.string().max(80).optional(),
  department: z.string().max(80).optional(),
  status: contactStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export const contactDetailSchema = contactSummarySchema.extend({
  company: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  notes: z.string().max(1000).optional(),
});

export const contactListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["firstName", "lastName", "title", "department", "createdAt"]).optional(),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  q: z.string().trim().max(200).optional(),
  status: contactStatusSchema.optional(),
  department: z.string().trim().max(80).optional(),
});

export const contactListResponseSchema = pageSchema(contactSummarySchema);

export type ContactStatus = z.infer<typeof contactStatusSchema>;
export type ContactSummary = z.infer<typeof contactSummarySchema>;
export type ContactDetail = z.infer<typeof contactDetailSchema>;
export type ContactListQuery = z.infer<typeof contactListQuerySchema>;
export type ContactListResponse = z.infer<typeof contactListResponseSchema>;
