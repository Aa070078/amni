import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@amni/db";
import { ImportsProcessor } from "./imports.processor";

vi.mock("@amni/db", () => ({
  prisma: {
    dataImportJob: { findFirst: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn(async () => ({})) },
  },
}));

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

  it("marks the import COMPLETED with a summary and notifies the initiator", async () => {
    (prisma.dataImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseJob,
      stage: "IMPORT",
      fileMetadata,
      mapping,
      validation: null,
      summary: null,
    });
    const notify = { add: vi.fn(async () => ({})) };
    const processor = new ImportsProcessor(notify as never);

    await processor.process({ data: { importId: "job-1", tenantId: "tenant-1" } } as never);

    expect(prisma.dataImportJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({
        stage: "COMPLETED",
        summary: expect.objectContaining({ totalRows: 2, created: 2, failed: 0 }),
        validation: { issues: [] },
        completedById: "user-1",
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalled();
    expect(notify.add).toHaveBeenCalledWith("notify", expect.objectContaining({ userId: "user-1", link: "/imports/job-1" }));
  });

  it("drops jobs for unknown imports", async () => {
    (prisma.dataImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await createProcessor().process({ data: { importId: "missing", tenantId: "tenant-1" } } as never);

    expect(prisma.dataImportJob.update).not.toHaveBeenCalled();
  });

  it("throws when the file or mapping is missing", async () => {
    (prisma.dataImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseJob,
      stage: "IMPORT",
      fileMetadata: null,
      mapping: null,
      validation: null,
      summary: null,
    });

    await expect(createProcessor().process({ data: { importId: "job-1", tenantId: "tenant-1" } } as never)).rejects.toThrow(
      "missing file metadata or mapping",
    );
  });

  it("persists a failed summary when rows are invalid", async () => {
    (prisma.dataImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseJob,
      stage: "IMPORT",
      fileMetadata: { ...fileMetadata, rows: [{ "Customer Name": null, Email: "a@acme.co" }] },
      mapping,
      validation: null,
      summary: null,
    });

    await createProcessor().process({ data: { importId: "job-1", tenantId: "tenant-1" } } as never);

    expect(prisma.dataImportJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({
        stage: "COMPLETED",
        summary: expect.objectContaining({ created: 0, failed: 1 }),
      }),
    });
  });
});
