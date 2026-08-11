import { z } from "zod";

/**
 * ErpGatewayModule proxy contract. These are the envelope-safe schemas for
 * the tenant-scoped ERP proxy in `apps/api`; the domain doctype schemas live
 * in `schemas/erp.ts`. The gateway never trusts a client-supplied tenant id —
 * the tenant is resolved server-side from the authenticated session.
 */

export const erpDoctypeSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z][A-Za-z0-9_ ]*$/, "Invalid doctype name");
export type ErpDoctype = z.infer<typeof erpDoctypeSchema>;

export const erpDocNameSchema = z.string().trim().min(1).max(255);
export type ErpDocName = z.infer<typeof erpDocNameSchema>;

export const erpMethodSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[A-Za-z][A-Za-z0-9_.]*$/, "Invalid whitelisted method name");

const erpFiltersSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },
  z.record(z.string(), z.unknown()),
);

export const erpListQuerySchema = z.object({
  filters: erpFiltersSchema.optional(),
  fields: z.array(z.string().trim().min(1).max(255)).max(100).optional(),
  orderBy: z.string().trim().min(1).max(255).optional(),
  limitPageLength: z.coerce.number().int().min(1).max(200).optional(),
  start: z.coerce.number().int().min(0).optional(),
});
export type ErpListQuery = z.infer<typeof erpListQuerySchema>;

export const erpUpdateQuerySchema = z.object({
  action: z.enum(["submit", "cancel"]).optional(),
});
export type ErpUpdateQuery = z.infer<typeof erpUpdateQuerySchema>;

export const erpDocBodySchema = z.record(z.string(), z.unknown());
export type ErpDocBody = z.infer<typeof erpDocBodySchema>;

export const erpCallArgsSchema = z.record(z.string(), z.unknown());
export type ErpCallArgs = z.infer<typeof erpCallArgsSchema>;

export const erpListResponseSchema = z.object({
  items: z.array(z.record(z.string(), z.unknown())),
  hasMore: z.boolean(),
});
export type ErpListResponse = z.infer<typeof erpListResponseSchema>;
