import { z } from "zod";
import { offsetPaginationSchema, searchSchema } from "../pagination.js";

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

export const importValidationSchema = z.object({
  issues: z.array(importIssueSchema),
  stats: z.object({
    totalRows: z.number().int().nonnegative(),
    errors: z.number().int().nonnegative(),
    warnings: z.number().int().nonnegative(),
  }),
});

// --- Templates (business-facing column registry, PRODUCT_SPEC §5) -------

export const importTemplateColumnTypeSchema = z.enum([
  "text",
  "email",
  "number",
  "currency",
  "date",
  "boolean",
]);

export const importTemplateColumnSchema = z.object({
  field: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  required: z.boolean().default(false),
  type: importTemplateColumnTypeSchema,
  description: z.string().max(240).optional(),
  example: z.string().max(80).optional(),
});

export const importTemplateSchema = z.object({
  kind: importKindSchema,
  label: z.string().min(1).max(80),
  description: z.string().max(240),
  keyField: z.string().optional(),
  columns: z.array(importTemplateColumnSchema),
});

export const IMPORT_TEMPLATES = [
  {
    kind: "customers",
    label: "Customers",
    description: "The people and companies you sell to.",
    keyField: "name",
    columns: [
      { field: "name", label: "Customer name", required: true, type: "text", description: "Full name of the customer.", example: "Acme Corp" },
      { field: "customerGroup", label: "Customer group", required: false, type: "text", description: "Group or segment the customer belongs to.", example: "Wholesale" },
      { field: "email", label: "Email", required: false, type: "email", description: "Primary contact email.", example: "billing@acme.com" },
      { field: "phone", label: "Phone", required: false, type: "text", description: "Primary phone number.", example: "+1 555 010 2233" },
      { field: "address", label: "Address", required: false, type: "text", description: "Street address.", example: "100 Market St" },
      { field: "city", label: "City", required: false, type: "text", description: "City.", example: "New York" },
      { field: "country", label: "Country", required: false, type: "text", description: "Country.", example: "US" },
      { field: "taxId", label: "Tax ID", required: false, type: "text", description: "VAT / tax registration number.", example: "US123456789" },
      { field: "currency", label: "Currency", required: false, type: "text", description: "ISO currency code.", example: "USD" },
    ],
  },
  {
    kind: "suppliers",
    label: "Suppliers",
    description: "The businesses you purchase from.",
    keyField: "name",
    columns: [
      { field: "name", label: "Supplier name", required: true, type: "text", description: "Full name of the supplier.", example: "Northwind Fabrics" },
      { field: "group", label: "Supplier group", required: false, type: "text", description: "Group or segment the supplier belongs to.", example: "Raw Materials" },
      { field: "email", label: "Email", required: false, type: "email", description: "Primary contact email.", example: "sales@northwind.io" },
      { field: "phone", label: "Phone", required: false, type: "text", description: "Primary phone number.", example: "+44 20 7946 0101" },
      { field: "currency", label: "Currency", required: false, type: "text", description: "ISO currency code.", example: "GBP" },
      { field: "paymentTerms", label: "Payment terms", required: false, type: "text", description: "Default payment terms.", example: "Net 30" },
      { field: "taxId", label: "Tax ID", required: false, type: "text", description: "VAT / tax registration number.", example: "GB123456789" },
    ],
  },
  {
    kind: "items",
    label: "Products",
    description: "The products and services you sell.",
    keyField: "sku",
    columns: [
      { field: "sku", label: "SKU / Code", required: true, type: "text", description: "Unique product code.", example: "FUR-CHAIR-01" },
      { field: "name", label: "Product name", required: true, type: "text", description: "Display name of the product.", example: "Ergonomic Office Chair" },
      { field: "category", label: "Category", required: true, type: "text", description: "Product category.", example: "Furniture" },
      { field: "unit", label: "Unit", required: false, type: "text", description: "Unit of measure.", example: "pcs" },
      { field: "price", label: "Selling price", required: false, type: "currency", description: "Standard selling price.", example: "249.00" },
      { field: "cost", label: "Cost", required: false, type: "currency", description: "Standard purchase cost.", example: "120.00" },
      { field: "reorderLevel", label: "Reorder level", required: false, type: "number", description: "Stock level that triggers a reorder.", example: "10" },
      { field: "vatRate", label: "VAT rate (%)", required: false, type: "number", description: "VAT rate as a percentage.", example: "20" },
      { field: "status", label: "Status", required: false, type: "text", description: "active, draft or disabled.", example: "active" },
      { field: "description", label: "Description", required: false, type: "text", description: "Long description.", example: "Ergonomic mesh-backed office chair" },
    ],
  },
  {
    kind: "contacts",
    label: "Contacts",
    description: "People you work with across the business.",
    keyField: "email",
    columns: [
      { field: "firstName", label: "First name", required: true, type: "text", description: "Contact first name.", example: "Amira" },
      { field: "lastName", label: "Last name", required: false, type: "text", description: "Contact last name.", example: "Haddad" },
      { field: "email", label: "Email", required: false, type: "email", description: "Contact email.", example: "amira@acme.com" },
      { field: "phone", label: "Phone", required: false, type: "text", description: "Contact phone.", example: "+20 2 456 1100" },
      { field: "jobTitle", label: "Job title", required: false, type: "text", description: "Job title.", example: "Chief Executive Officer" },
      { field: "department", label: "Department", required: false, type: "text", description: "Department.", example: "Executive" },
      { field: "company", label: "Company", required: false, type: "text", description: "Company they belong to.", example: "Acme Corp" },
      { field: "address", label: "Address", required: false, type: "text", description: "Street address.", example: "10 Innovation Drive" },
      { field: "notes", label: "Notes", required: false, type: "text", description: "Free-form notes.", example: "Primary decision maker." },
    ],
  },
  {
    kind: "leads",
    label: "Leads",
    description: "Potential opportunities in your pipeline.",
    columns: [
      { field: "company", label: "Company", required: true, type: "text", description: "Company the lead represents.", example: "Acme Corp" },
      { field: "contactName", label: "Contact name", required: true, type: "text", description: "Primary contact.", example: "Omar Khalil" },
      { field: "contactEmail", label: "Email", required: false, type: "email", description: "Primary contact email.", example: "omar@acme.com" },
      { field: "contactPhone", label: "Phone", required: false, type: "text", description: "Primary contact phone.", example: "+20 2 456 1120" },
      { field: "source", label: "Source", required: false, type: "text", description: "Where the lead came from.", example: "Website" },
      { field: "stage", label: "Stage", required: false, type: "text", description: "Pipeline stage.", example: "Qualification" },
      { field: "value", label: "Value", required: false, type: "currency", description: "Expected deal value.", example: "25000" },
      { field: "probability", label: "Probability (%)", required: false, type: "number", description: "Win probability.", example: "60" },
      { field: "expectedClose", label: "Expected close (YYYY-MM-DD)", required: false, type: "date", description: "Expected close date.", example: "2026-12-31" },
      { field: "owner", label: "Owner", required: false, type: "text", description: "Salesperson responsible.", example: "Daniel Osei" },
      { field: "notes", label: "Notes", required: false, type: "text", description: "Free-form notes.", example: "Follow up in Q4." },
    ],
  },
] as const satisfies readonly ImportTemplate[];

export type ImportTemplate = z.infer<typeof importTemplateSchema>;
export type ImportTemplateColumn = z.infer<typeof importTemplateColumnSchema>;

// --- Job + flow contracts -------------------------------------------------

export const importFileMetadataSchema = z.object({
  fileName: z.string().min(1).max(255),
  size: z.number().int().nonnegative(),
  rowCount: z.number().int().nonnegative(),
  headers: z.array(z.string().min(1).max(120)),
  sampleRows: z.array(z.record(z.string(), z.unknown())).max(10).default([]),
  suggestedMapping: importMappingSchema.optional(),
});

export const importJobSchema = z.object({
  id: z.string().uuid(),
  kind: importKindSchema,
  mode: importModeSchema,
  stage: importStageSchema,
  file: importFileMetadataSchema.optional(),
  mapping: importMappingSchema.optional(),
  validation: importValidationSchema.optional(),
  summary: importSummarySchema.optional(),
  errorRowsUrl: z.string().max(512).optional(),
  initiatedBy: z.string().email().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createImportJobInputSchema = z.object({
  kind: importKindSchema,
  mode: importModeSchema.default("create"),
  keyField: z.string().trim().max(64).optional(),
});

export const setImportFileInputSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  content: z.string().min(1).max(5_000_000),
});

export const setImportMappingInputSchema = z.object({
  mapping: importMappingSchema,
});

export const importValidationResponseSchema = importValidationSchema.nullable();

export const importJobListQuerySchema = offsetPaginationSchema.merge(searchSchema).extend({
  kind: importKindSchema.optional(),
  stage: importStageSchema.optional(),
});

export const importJobListResponseSchema = z.object({
  items: z.array(importJobSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  }),
});

export const startImportResponseSchema = z.object({
  jobId: z.string().uuid(),
  startedAt: z.string().datetime(),
});

export const importErrorRowsResponseSchema = z.object({
  fileName: z.string().min(1).max(255),
  content: z.string(),
});

export const IMPORT_STAGES = [
  { value: "PRE_IMPORT", label: "Choose what to import" },
  { value: "UPLOAD", label: "Upload your file" },
  { value: "MAPPING", label: "Match your columns" },
  { value: "VALIDATION", label: "Review & fix" },
  { value: "IMPORT", label: "Import" },
  { value: "COMPLETED", label: "Done" },
] as const;

export type ImportFileMetadata = z.infer<typeof importFileMetadataSchema>;
export type ImportJob = z.infer<typeof importJobSchema>;
export type CreateImportJobInput = z.infer<typeof createImportJobInputSchema>;
export type SetImportFileInput = z.infer<typeof setImportFileInputSchema>;
export type SetImportMappingInput = z.infer<typeof setImportMappingInputSchema>;
export type ImportValidation = z.infer<typeof importValidationSchema>;
export type ImportValidationResponse = z.infer<typeof importValidationResponseSchema>;
export type ImportJobListQuery = z.infer<typeof importJobListQuerySchema>;
export type ImportJobListResponse = z.infer<typeof importJobListResponseSchema>;
export type StartImportResponse = z.infer<typeof startImportResponseSchema>;
export type ImportErrorRowsResponse = z.infer<typeof importErrorRowsResponseSchema>;
