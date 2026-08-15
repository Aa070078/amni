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

export const importCellValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const importFileMetadataSchema = z.object({
  filename: z.string().min(1).max(255),
  size: z.number().int().nonnegative(),
  delimiter: z.string().max(1).default(","),
  encoding: z.string().max(20).default("utf-8"),
  totalRows: z.number().int().nonnegative(),
  headers: z.array(z.string()).min(1),
  preview: z.array(z.record(z.string(), importCellValueSchema)).max(50).default([]),
  rows: z.array(z.record(z.string(), importCellValueSchema)).default([]),
});

export const importValidationSchema = z.object({
  issues: z.array(importIssueSchema),
});

export const importJobSchema = z.object({
  id: z.string().min(1),
  kind: importKindSchema,
  stage: importStageSchema,
  fileMetadata: importFileMetadataSchema.optional(),
  mapping: importMappingSchema.optional(),
  validation: importValidationSchema.optional(),
  summary: importSummarySchema.optional(),
  errorRowsUrl: z.string().max(512).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createImportInputSchema = z.object({
  kind: importKindSchema,
});

export const importJobListResponseSchema = z.object({
  items: z.array(importJobSchema),
  total: z.number().int().nonnegative(),
});

export const importTemplateColumnSchema = z.object({
  field: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().default(false),
  type: z.string().default("text"),
});

export const importTemplateSchema = z.object({
  kind: importKindSchema,
  label: z.string().min(1),
  description: z.string().default(""),
  columns: z.array(importTemplateColumnSchema),
});

export const importTemplatesResponseSchema = z.object({
  items: z.array(importTemplateSchema),
});

export const importValidationResultSchema = z.object({
  summary: importSummarySchema,
  issues: z.array(importIssueSchema),
});

export const importSummaryResponseSchema = z.object({
  summary: importSummarySchema,
  errorRowsUrl: z.string().max(512).optional(),
});

export type ImportStage = z.infer<typeof importStageSchema>;
export type ImportMode = z.infer<typeof importModeSchema>;
export type ImportKind = z.infer<typeof importKindSchema>;
export type ImportMapping = z.infer<typeof importMappingSchema>;
export type ImportIssue = z.infer<typeof importIssueSchema>;
export type ImportSummary = z.infer<typeof importSummarySchema>;
export type ImportCellValue = z.infer<typeof importCellValueSchema>;
export type ImportFileMetadata = z.infer<typeof importFileMetadataSchema>;
export type ImportValidation = z.infer<typeof importValidationSchema>;
export type ImportJob = z.infer<typeof importJobSchema>;
export type CreateImportInput = z.infer<typeof createImportInputSchema>;
export type ImportJobListResponse = z.infer<typeof importJobListResponseSchema>;
export type ImportTemplateColumn = z.infer<typeof importTemplateColumnSchema>;
export type ImportTemplate = z.infer<typeof importTemplateSchema>;
export type ImportTemplatesResponse = z.infer<typeof importTemplatesResponseSchema>;
export type ImportValidationResult = z.infer<typeof importValidationResultSchema>;
export type ImportSummaryResponse = z.infer<typeof importSummaryResponseSchema>;
