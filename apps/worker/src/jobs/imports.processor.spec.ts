import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@amni/db";
import { createErpClientForTenant } from "@amni/erp";
import type * as ErpModule from "@amni/erp";
import { ImportsProcessor } from "./imports.processor";

vi.mock("@amni/db", () => ({
  prisma: {
    dataImportJob: { findFirst: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn(async () => ({})) },
  },
}));

vi.mock("@amni/erp", async (importOriginal) => {
  const actual = await importOriginal<typeof ErpModule>();
  return {
    ...actual,
    createErpClientForTenant: vi.fn(async () => ({
      create: vi.fn(async (doctype: string, doc: Record<string, unknown>) => ({
        name: `${doctype}-${Math.random().toString(36).slice(2)}`,
        ...doc,
      })),
      update: vi.fn(async (_doctype: string, name: string, doc: Record<string, unknown>) => ({ name, ...doc })),
      list: vi.fn(async () => ({ items: [], hasMore: false })),
    })),
  };
});

const baseJob = {
  id: "job-1",
  tenantId: "tenant-1",
  companyId: "company-1",
  kind: "customers",
  initiatedById: "user-1",
  completedById: null,
  errorRowsUrl: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const fileMetadata = {
  filename: "customers.csv",
  size: 42,
  delimiter: ",",
  encoding: "utf-8",
  totalRows: 2,
  headers: ["Customer Name", "Email"],
  preview: [],
  rows: [{ "Customer Name": "Acme", Email: "a@acme.co" }, { "Customer Name": "Bolt", Email: "b@bolt.co" }],
};

const mapping = {
  mode: "create" as const,
  columns: [{ sourceHeader: "Customer Name", targetField: "customer_name", required: true }],
};

describe("ImportsProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.dataImportJob.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "job-1" });
  });

  const createProcessor = () => new ImportsProcessor({ add: vi.fn(async () => ({})) } as never);

  const findJob = (overrides: Record<string, unknown> = {}) =>
    (prisma.dataImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseJob,
      stage: "IMPORT",
      fileMetadata,
      mapping,
      validation: null,
      summary: null,
      ...overrides,
    });

  it("writes valid rows to the tenant ERP and marks the import COMPLETED with a real summary", async () => {
    findJob();

    const notify = { add: vi.fn(async () => ({})) };
    const processor = new ImportsProcessor(notify as never);

    await processor.process({ data: { importId: "job-1", tenantId: "tenant-1" } } as never);

    expect(createErpClientForTenant).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-1", requestId: "job-1" }),
    );
    expect(prisma.dataImportJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({
        stage: "COMPLETED",
        summary: { totalRows: 2, created: 2, updated: 0, skipped: 0, failed: 0, warnings: 0 },
        validation: { issues: [] },
        completedById: "user-1",
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalled();
    expect(notify.add).toHaveBeenCalledWith(
      "notify",
      expect.objectContaining({ userId: "user-1", link: "/imports/job-1", body: expect.stringContaining("2 created") }),
    );
  });

  it("drops jobs for unknown imports", async () => {
    (prisma.dataImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await createProcessor().process({ data: { importId: "missing", tenantId: "tenant-1" } } as never);

    expect(prisma.dataImportJob.update).not.toHaveBeenCalled();
  });

  it("throws when the file or mapping is missing", async () => {
    findJob({ fileMetadata: null, mapping: null });

    await expect(createProcessor().process({ data: { importId: "job-1", tenantId: "tenant-1" } } as never)).rejects.toThrow(
      "missing file metadata or mapping",
    );
  });

  it("skips rows that fail validation without calling the ERP", async () => {
    findJob({ fileMetadata: { ...fileMetadata, rows: [{ "Customer Name": null, Email: "a@acme.co" }] } });

    await createProcessor().process({ data: { importId: "job-1", tenantId: "tenant-1" } } as never);

    expect(prisma.dataImportJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({
        stage: "COMPLETED",
        summary: { totalRows: 1, created: 0, updated: 0, skipped: 1, failed: 0, warnings: 0 },
      }),
    });
  });

  it("marks every valid row failed when the tenant ERP is unreachable", async () => {
    findJob();
    (createErpClientForTenant as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("connection refused"));

    await createProcessor().process({ data: { importId: "job-1", tenantId: "tenant-1" } } as never);

    expect(prisma.dataImportJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({
        stage: "COMPLETED",
        summary: { totalRows: 2, created: 0, updated: 0, skipped: 0, failed: 2, warnings: 0 },
      }),
    });
  });

  it("reports row-level ERP failures in the summary", async () => {
    findJob();
    (createErpClientForTenant as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      create: vi.fn(async () => {
        throw new Error("Mandatory field missing");
      }),
      update: vi.fn(),
      list: vi.fn(async () => ({ items: [], hasMore: false })),
    });

    await createProcessor().process({ data: { importId: "job-1", tenantId: "tenant-1" } } as never);

    expect(prisma.dataImportJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({
        summary: { totalRows: 2, created: 0, updated: 0, skipped: 0, failed: 2, warnings: 0 },
      }),
    });
  });
});
