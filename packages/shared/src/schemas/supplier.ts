import { z } from "zod";
import { pageSchema } from "../pagination.js";
import { emailSchema } from "./auth.js";
import { currencySchema } from "./company.js";

export const supplierStatusSchema = z.enum(["active", "disabled"]);

export const supplierOrderStatusSchema = z.enum(["draft", "submitted", "received", "cancelled"]);

export const supplierAddressSchema = z.object({
  line1: z.string().trim().max(120).optional(),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  country: z.string().trim().min(2).max(3).optional(),
  postalCode: z.string().trim().max(20).optional(),
});

export const supplierSummarySchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  email: emailSchema.optional(),
  phone: z.string().max(40).optional(),
  territory: z.string().max(80).optional(),
  supplierGroup: z.string().max(80).optional(),
  status: supplierStatusSchema,
  currency: currencySchema,
  balance: z.number().finite(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export const supplierOrderSummarySchema = z.object({
  id: z.string().min(1).max(64),
  number: z.string().min(1).max(40),
  date: z.string().datetime(),
  total: z.number().finite(),
  status: supplierOrderStatusSchema,
});

export const supplierStatsSchema = z.object({
  totalPurchased: z.number().finite(),
  totalPaid: z.number().finite(),
  outstanding: z.number().finite(),
  orderCount: z.number().int().nonnegative(),
  lastOrderAt: z.string().datetime().optional(),
});

export const supplierDetailSchema = supplierSummarySchema.extend({
  legalName: z.string().max(200).optional(),
  taxId: z.string().max(40).optional(),
  website: z.string().max(200).optional(),
  creditLimit: z.number().finite().positive().optional(),
  billingAddress: supplierAddressSchema.optional(),
  notes: z.string().max(1000).optional(),
  stats: supplierStatsSchema,
  recentOrders: z.array(supplierOrderSummarySchema).max(20),
});

export const supplierListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["name", "territory", "supplierGroup", "balance", "createdAt"]).optional(),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  q: z.string().trim().max(200).optional(),
  status: supplierStatusSchema.optional(),
  territory: z.string().trim().max(80).optional(),
});

export const supplierListResponseSchema = pageSchema(supplierSummarySchema);

export type SupplierStatus = z.infer<typeof supplierStatusSchema>;
export type SupplierOrderStatus = z.infer<typeof supplierOrderStatusSchema>;
export type SupplierAddress = z.infer<typeof supplierAddressSchema>;
export type SupplierSummary = z.infer<typeof supplierSummarySchema>;
export type SupplierOrderSummary = z.infer<typeof supplierOrderSummarySchema>;
export type SupplierStats = z.infer<typeof supplierStatsSchema>;
export type SupplierDetail = z.infer<typeof supplierDetailSchema>;
export type SupplierListQuery = z.infer<typeof supplierListQuerySchema>;
export type SupplierListResponse = z.infer<typeof supplierListResponseSchema>;
