import { Logger } from "@nestjs/common";
import { prisma } from "@amni/db";
import { IMPORT_TEMPLATES, importMappingSchema, type ImportSummary } from "@amni/shared";

import type { ImportDriver } from "./import-driver";
import { buildCsv } from "./csv";

/** Stored file metadata shape as written by the API (shared contract + rows). */
interface StoredFileMetadata {
  fileName: string;
  size: number;
  rowCount: number;
  headers: string[];
  sampleRows: unknown[];
  suggestedMapping?: unknown;
  rows: Array<Record<string, string>>;
}

interface StoredSummary extends ImportSummary {
  failedRowsCsv?: string;
}

export interface RunImportInput {
  jobId: string;
  tenantId: string;
  driver: ImportDriver;
  logger?: Logger;
}

/**
 * Executes one import job: reads the staged job, applies each mapped row via
 * the driver, then persists the summary, clears the staged rows and flips the
 * job to COMPLETED. Failed rows are captured as a bounded CSV for the
 * error-rows download endpoint.
 */
export async function runImportJob(input: RunImportInput): Promise<void> {
  const { jobId, tenantId, driver, logger } = input;
  const job = await prisma.dataImportJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) {
    throw new Error(`import job ${jobId} not found`);
  }
  if (job.stage === "COMPLETED") {
    logger?.log(`import ${jobId} already completed`);
    return;
  }

  const file = job.fileMetadata as StoredFileMetadata | null;
  const mapping = job.mapping ? importMappingSchema.parse(job.mapping) : null;
  if (!file?.rows?.length || !mapping) {
    await prisma.dataImportJob.update({
      where: { id: job.id },
      data: {
        stage: "COMPLETED",
        summary: { totalRows: 0, created: 0, updated: 0, skipped: 0, failed: 0, warnings: 0 },
      },
    });
    logger?.warn(`import ${jobId} had no staged rows; marked completed empty`);
    return;
  }

  const template = IMPORT_TEMPLATES.find((entry) => entry.kind === job.kind);
  if (!template) {
    throw new Error(`unknown import kind ${job.kind}`);
  }

  const mapped = mapping.columns.filter((column) => column.targetField !== "");
  const templateColumns = new Map(template.columns.map((column) => [column.field, column]));

  const stats = { totalRows: 0, created: 0, updated: 0, skipped: 0, failed: 0, warnings: 0 };
  const failedData: Array<Array<string | number>> = [];

  const context = {
    jobId: job.id,
    tenantId,
    kind: job.kind,
    mode: mapping.mode,
    keyField: mapping.keyField,
  };

  for (const [index, record] of file.rows.entries()) {
    const rowNumber = index + 1;
    stats.totalRows++;

    const domain: Record<string, string> = {};
    for (const column of mapped) {
      const value = record[column.sourceHeader] ?? "";
      const target = templateColumns.get(column.targetField);
      domain[column.targetField] = target?.type === "text" && value === "" ? "Untitled" : value;
    }

    let result;
    try {
      result = await driver.apply(domain, context);
    } catch (error) {
      result = { status: "failed" as const, message: error instanceof Error ? error.message : "unexpected error" };
    }

    if (result.status === "created") stats.created++;
    else if (result.status === "updated") stats.updated++;
    else if (result.status === "skipped") {
      stats.skipped++;
      stats.warnings++;
    } else {
      stats.failed++;
      failedData.push(
        file.headers.map((header) => record[header] ?? ""),
      );
    }
    if (result.message) logger?.warn(`import ${jobId} row ${rowNumber}: ${result.message}`);
  }

  const failedRowsCsv = stats.failed > 0 ? buildCsv(file.headers, failedData) : undefined;
  const summary: StoredSummary = {
    totalRows: stats.totalRows,
    created: stats.created,
    updated: stats.updated,
    skipped: stats.skipped,
    failed: stats.failed,
    warnings: stats.warnings,
    ...(failedRowsCsv !== undefined ? { failedRowsCsv } : {}),
  };
  const errorRowsUrl = stats.failed > 0 ? `/imports/jobs/${job.id}/error-rows` : null;

  await prisma.dataImportJob.update({
    where: { id: job.id },
    data: {
      stage: "COMPLETED",
      summary,
      errorRowsUrl,
      fileMetadata: { ...file, rows: undefined, sampleRows: undefined },
      completedById: job.initiatedById,
    },
  });

  logger?.log(
    `import ${jobId} done: ${stats.totalRows} rows, ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.failed} failed`,
  );
}
