import { z } from "zod";
import { financeKpiSchema } from "./finance.js";
import { offsetPaginationSchema, searchSchema, sortSchema } from "../pagination.js";

export const signDocumentTypeSchema = z.enum(["invoice", "quotation", "purchase_order", "contract", "proposal", "other"]);

export const SIGN_DOCUMENT_TYPES = [
  { value: "invoice", label: "Invoice" },
  { value: "quotation", label: "Quotation" },
  { value: "purchase_order", label: "Purchase order" },
  { value: "contract", label: "Contract" },
  { value: "proposal", label: "Proposal" },
  { value: "other", label: "Other" },
] as const;

export const signerStatusSchema = z.enum(["pending", "signed", "declined"]);

export const SIGNER_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "signed", label: "Signed" },
  { value: "declined", label: "Declined" },
] as const;

export const signRequestStatusSchema = z.enum(["draft", "sent", "awaiting_signature", "completed", "declined", "expired"]);

export const SIGN_REQUEST_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "awaiting_signature", label: "Awaiting signature" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
] as const;

export const signerSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  email: z.string().email().max(254),
  role: z.string().max(80).optional(),
  status: signerStatusSchema,
  signedAt: z.string().datetime().nullable().optional(),
});

export const signRequestSchema = z.object({
  code: z.string().regex(/^SIG-\d{4}$/),
  title: z.string().min(1).max(160),
  documentType: signDocumentTypeSchema,
  documentCode: z.string().max(40).optional(),
  status: signRequestStatusSchema,
  signers: z.array(signerSchema),
  expiresAt: z.string().datetime().nullable().optional(),
  createdBy: z.string().max(120).optional(),
  notes: z.string().max(2_000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createSignRequestInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  documentType: signDocumentTypeSchema,
  documentCode: z.string().trim().max(40).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(2_000).optional(),
  signers: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        email: z.string().email().max(254),
        role: z.string().trim().max(80).optional(),
      }),
    )
    .min(1)
    .max(20),
});

export const updateSignRequestInputSchema = createSignRequestInputSchema.partial();

export const declineSignRequestInputSchema = z.object({
  signerCode: z.string().min(1).max(40),
  reason: z.string().trim().max(2_000).optional(),
});

export const signRequestListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: signRequestStatusSchema.optional(),
});

export const signRequestListResponseSchema = z.object({
  items: z.array(signRequestSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type SignDocumentType = z.infer<typeof signDocumentTypeSchema>;
export type SignerStatus = z.infer<typeof signerStatusSchema>;
export type SignRequestStatus = z.infer<typeof signRequestStatusSchema>;
export type Signer = z.infer<typeof signerSchema>;
export type SignRequest = z.infer<typeof signRequestSchema>;
export type CreateSignRequestInput = z.infer<typeof createSignRequestInputSchema>;
export type UpdateSignRequestInput = z.infer<typeof updateSignRequestInputSchema>;
export type DeclineSignRequestInput = z.infer<typeof declineSignRequestInputSchema>;
export type SignRequestListQuery = z.infer<typeof signRequestListQuerySchema>;
export type SignRequestListResponse = z.infer<typeof signRequestListResponseSchema>;

export const signTemplateStatusSchema = z.enum(["active", "archived"]);

export const signTemplateSchema = z.object({
  code: z.string().regex(/^STMP-\d{4}$/),
  name: z.string().min(1).max(160),
  documentType: signDocumentTypeSchema,
  signerRoles: z.array(z.string().min(1).max(80)),
  version: z.number().int().positive().default(1),
  status: signTemplateStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createSignTemplateInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  documentType: signDocumentTypeSchema,
  signerRoles: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
});

export const updateSignTemplateInputSchema = createSignTemplateInputSchema.partial();

export const signTemplateListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: signTemplateStatusSchema.optional(),
});

export const signTemplateListResponseSchema = z.object({
  items: z.array(signTemplateSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type SignTemplateStatus = z.infer<typeof signTemplateStatusSchema>;
export type SignTemplate = z.infer<typeof signTemplateSchema>;
export type CreateSignTemplateInput = z.infer<typeof createSignTemplateInputSchema>;
export type UpdateSignTemplateInput = z.infer<typeof updateSignTemplateInputSchema>;
export type SignTemplateListQuery = z.infer<typeof signTemplateListQuerySchema>;
export type SignTemplateListResponse = z.infer<typeof signTemplateListResponseSchema>;

export const signAuditEventSchema = z.object({
  id: z.string().min(1).max(64),
  requestCode: z.string().min(1).max(40),
  event: z.enum(["sent", "viewed", "signed", "declined", "completed", "expired"]),
  actor: z.string().max(120).optional(),
  at: z.string().datetime(),
  detail: z.string().max(2_000).optional(),
});

export const signAuditListQuerySchema = offsetPaginationSchema.merge(searchSchema);

export const signAuditResponseSchema = z.object({
  items: z.array(signAuditEventSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type SignAuditEvent = z.infer<typeof signAuditEventSchema>;
export type SignAuditListQuery = z.infer<typeof signAuditListQuerySchema>;
export type SignAuditResponse = z.infer<typeof signAuditResponseSchema>;

export const signOverviewSchema = z.object({
  asOf: z.string().datetime(),
  kpis: z.array(financeKpiSchema),
  pendingForMe: z.number().int().nonnegative(),
  awaitingSignature: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  templatesActive: z.number().int().nonnegative(),
});

export type SignOverview = z.infer<typeof signOverviewSchema>;
