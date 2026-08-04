import { z } from "zod";

export const importStageSchema = z.enum([
  "PRE_IMPORT",
  "UPLOAD",
  "MAPPING",
  "VALIDATION",
  "IMPORT",
  "COMPLETED",
]);

export const importModeSchema = z.enum(["create", "update_by_key", "upsert"]);

export const importKindSchema = z.enum([
  "customers",
  "items",
  "suppliers",
  "contacts",
  "leads",
]);

export const columnMappingSchema = z.object({
  sourceHeader: z.string(),
  targetField: z.string(),
  required: z.boolean().default(false),
  type: z.string().optional(),
});

export const importMappingSchema = z.object({
  mode: importModeSchema,
  keyField: z.string().optional(),
  columns: z.array(columnMappingSchema),
  sheetName: z.string().optional(),
});

export const importValidationSeveritySchema = z.enum(["warning", "error"]);

export const importIssueSchema = z.object({
  row: z.number().int().positive().optional(),
  column: z.string().optional(),
  severity: importValidationSeveritySchema,
  message: z.string(),
});

export const importSummarySchema = z.object({
  totalRows: z.number().int().nonnegative(),
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  warnings: z.number().int().nonnegative(),
});

export type ImportStage = z.infer<typeof importStageSchema>;
export type ImportMode = z.infer<typeof importModeSchema>;
export type ImportKind = z.infer<typeof importKindSchema>;
export type ImportMapping = z.infer<typeof importMappingSchema>;
export type ImportIssue = z.infer<typeof importIssueSchema>;
export type ImportSummary = z.infer<typeof importSummarySchema>;
