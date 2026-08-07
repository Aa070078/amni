import { z } from "zod";
import { offsetPaginationSchema, pageSchema, searchSchema, sortSchema } from "../pagination.js";
import { emailSchema } from "./auth.js";
import { currencySchema } from "./company.js";

export const salesCustomerStatusSchema = z.enum(["active", "inactive"]);
export const salesCustomerTypeSchema = z.enum(["company", "individual"]);

export const salesCustomerSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  email: emailSchema.optional(),
  phone: z.string().max(40).optional(),
  type: salesCustomerTypeSchema,
  status: salesCustomerStatusSchema,
  currency: currencySchema,
  city: z.string().max(80).optional(),
  totalOrders: z.number().int().nonnegative(),
  totalValue: z.number().finite().nonnegative(),
  outstanding: z.number().finite().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const salesCustomerOrderStatusSchema = z.enum(["draft", "submitted", "invoiced", "paid"]);

export const salesCustomerOrderSchema = z.object({
  id: z.string().min(1).max(64),
  number: z.string().min(1).max(64),
  date: z.string().datetime(),
  status: salesCustomerOrderStatusSchema,
  total: z.number().finite().nonnegative(),
  currency: currencySchema,
});

export const salesCustomerDetailSchema = salesCustomerSchema.extend({
  billingAddress: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
  recentOrders: z.array(salesCustomerOrderSchema),
});

export const salesCustomerListQuerySchema = offsetPaginationSchema
  .merge(sortSchema)
  .merge(searchSchema)
  .extend({
    status: salesCustomerStatusSchema.optional(),
    type: salesCustomerTypeSchema.optional(),
  });

export const salesCustomerListResponseSchema = pageSchema(salesCustomerSchema);

export const createSalesCustomerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: emailSchema.optional(),
  phone: z.string().trim().max(40).optional(),
  type: salesCustomerTypeSchema.default("company"),
  currency: currencySchema.default("USD"),
  city: z.string().trim().max(80).optional(),
  billingAddress: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateSalesCustomerSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: emailSchema.optional(),
  phone: z.string().trim().max(40).optional(),
  type: salesCustomerTypeSchema.optional(),
  currency: currencySchema.optional(),
  city: z.string().trim().max(80).optional(),
  billingAddress: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(1000).optional(),
  status: salesCustomerStatusSchema.optional(),
});

export type SalesCustomerStatus = z.infer<typeof salesCustomerStatusSchema>;
export type SalesCustomerType = z.infer<typeof salesCustomerTypeSchema>;
export type SalesCustomer = z.infer<typeof salesCustomerSchema>;
export type SalesCustomerOrderStatus = z.infer<typeof salesCustomerOrderStatusSchema>;
export type SalesCustomerOrder = z.infer<typeof salesCustomerOrderSchema>;
export type SalesCustomerDetail = z.infer<typeof salesCustomerDetailSchema>;
export type SalesCustomerListQuery = z.infer<typeof salesCustomerListQuerySchema>;
export type SalesCustomerListResponse = z.infer<typeof salesCustomerListResponseSchema>;
export type CreateSalesCustomerInput = z.infer<typeof createSalesCustomerSchema>;
export type UpdateSalesCustomerInput = z.infer<typeof updateSalesCustomerSchema>;
