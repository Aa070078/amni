import { z } from "zod";
import { currencySchema } from "./company.js";
import { offsetPaginationSchema, searchSchema, sortSchema } from "../pagination.js";

export const productStatusSchema = z.enum(["active", "draft", "disabled"]);

export const PRODUCT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "disabled", label: "Disabled" },
] as const;

export const productSchema = z.object({
  code: z.string().regex(/^PRD-\d{4}$/),
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(80),
  unit: z.string().min(1).max(12).default("pcs"),
  price: z.number().nonnegative().finite(),
  cost: z.number().nonnegative().finite(),
  currency: currencySchema.default("USD"),
  status: productStatusSchema,
  description: z.string().max(2_000).optional(),
  reorderLevel: z.number().nonnegative().finite().default(0),
  isStockItem: z.boolean().default(true),
  isSalesItem: z.boolean().default(true),
  isPurchaseItem: z.boolean().default(false),
  vatRate: z.number().nonnegative().max(100).default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createProductInputSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(80),
  unit: z.string().trim().min(1).max(12).default("pcs"),
  price: z.coerce.number().nonnegative().finite(),
  cost: z.coerce.number().nonnegative().finite().default(0),
  currency: currencySchema.default("USD"),
  status: productStatusSchema.default("draft"),
  description: z.string().trim().max(2_000).optional(),
  reorderLevel: z.coerce.number().nonnegative().finite().default(0),
  isStockItem: z.boolean().default(true),
  isSalesItem: z.boolean().default(true),
  isPurchaseItem: z.boolean().default(false),
  vatRate: z.coerce.number().nonnegative().max(100).default(0),
});

export const updateProductInputSchema = createProductInputSchema.partial();

export const productListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  category: z.string().optional(),
  status: productStatusSchema.optional(),
});

export const productListResponseSchema = z.object({
  items: z.array(productSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export const stockLevelSchema = z.object({
  productCode: z.string().min(1).max(40),
  warehouseCode: z.string().min(1).max(40),
  onHand: z.number().nonnegative().finite(),
  reserved: z.number().nonnegative().finite().default(0),
  available: z.number().nonnegative().finite(),
  reorderLevel: z.number().nonnegative().finite().default(0),
});

export type ProductStatus = z.infer<typeof productStatusSchema>;
export type Product = z.infer<typeof productSchema>;
export type CreateProductInput = z.infer<typeof createProductInputSchema>;
export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type ProductListResponse = z.infer<typeof productListResponseSchema>;
export type StockLevel = z.infer<typeof stockLevelSchema>;

export const warehouseStatusSchema = z.enum(["active", "inactive"]);

export const WAREHOUSE_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export const warehouseSchema = z.object({
  code: z.string().regex(/^WH-\d{4}$/),
  name: z.string().min(1).max(120),
  location: z.string().max(200).optional(),
  manager: z.string().max(120).optional(),
  status: warehouseStatusSchema,
  isDefault: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createWarehouseInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  location: z.string().trim().max(200).optional(),
  manager: z.string().trim().max(120).optional(),
  status: warehouseStatusSchema.default("active"),
  isDefault: z.boolean().default(false),
});

export const updateWarehouseInputSchema = createWarehouseInputSchema.partial();

export const warehouseListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: warehouseStatusSchema.optional(),
});

export const warehouseListResponseSchema = z.object({
  items: z.array(warehouseSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export const warehouseDetailSchema = warehouseSchema.extend({
  stock: z.array(stockLevelSchema),
  lowStock: z.array(stockLevelSchema),
});

export type WarehouseStatus = z.infer<typeof warehouseStatusSchema>;
export type Warehouse = z.infer<typeof warehouseSchema>;
export type CreateWarehouseInput = z.infer<typeof createWarehouseInputSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseInputSchema>;
export type WarehouseListQuery = z.infer<typeof warehouseListQuerySchema>;
export type WarehouseListResponse = z.infer<typeof warehouseListResponseSchema>;
export type WarehouseDetail = z.infer<typeof warehouseDetailSchema>;

export const movementTypeSchema = z.enum(["in", "out", "transfer", "adjust"]);

export const MOVEMENT_TYPES = [
  { value: "in", label: "In" },
  { value: "out", label: "Out" },
  { value: "transfer", label: "Transfer" },
  { value: "adjust", label: "Adjustment" },
] as const;

export const stockMovementSchema = z.object({
  code: z.string().regex(/^MOV-\d{4}$/),
  type: movementTypeSchema,
  productCode: z.string().min(1).max(40),
  productName: z.string().min(1).max(200),
  uom: z.string().min(1).max(12).default("pcs"),
  quantity: z.number().positive().finite(),
  fromWarehouse: z.string().max(40).nullable().optional(),
  toWarehouse: z.string().max(40).nullable().optional(),
  reason: z.string().max(240).optional(),
  reference: z.string().max(40).optional(),
  createdBy: z.string().max(120).optional(),
  date: z.string().datetime(),
});

export const createStockMovementInputSchema = z.object({
  type: movementTypeSchema,
  productCode: z.string().min(1).max(40),
  quantity: z.coerce.number().positive().finite(),
  fromWarehouse: z.string().trim().max(40).nullable().optional(),
  toWarehouse: z.string().trim().max(40).nullable().optional(),
  reason: z.string().trim().max(240).optional(),
  reference: z.string().trim().max(40).optional(),
});

export const stockMovementListQuerySchema = offsetPaginationSchema.merge(searchSchema).merge(sortSchema).extend({
  type: movementTypeSchema.optional(),
  productCode: z.string().optional(),
});

export const stockMovementListResponseSchema = z.object({
  items: z.array(stockMovementSchema),
  meta: z.object({ total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }),
});

export type MovementType = z.infer<typeof movementTypeSchema>;
export type StockMovement = z.infer<typeof stockMovementSchema>;
export type CreateStockMovementInput = z.infer<typeof createStockMovementInputSchema>;
export type StockMovementListQuery = z.infer<typeof stockMovementListQuerySchema>;
export type StockMovementListResponse = z.infer<typeof stockMovementListResponseSchema>;
