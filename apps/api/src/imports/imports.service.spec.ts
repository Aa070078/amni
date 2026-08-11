import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorCode } from "@amni/shared";

import { prisma } from "@amni/db";
import { ImportsService } from "./imports.service";
import { ApiException } from "../common/api.exception";

vi.mock("@amni/db", () => {
  return {
    Prisma: { JsonNull: "JSON_NULL" },
    prisma: {
      membership: { findFirst: vi.fn() },
      dataImportJob: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
      auditLog: { create: vi.fn(async () => ({})) },
    },
  };
});

const meta = { ip: "127.0.0.1", userAgent: "vitest", requestId: "req-1" };

const membership = {
  companyId: "company-1",
  company: { tenant: { id: "tenant-1" } },
};

const fileMetadata = {
  filename: "customers.csv",
  size: 42,
  delimiter: ",",
  encoding: "utf-8",
  totalRows: 2,
  headers: ["Customer Name", "Email"],
  preview: [{ "Customer Name": "Acme", Email: "a@acme.co" }],
  rows: [{ "Customer Name": "Acme", Email: "a@acme.co" }, { "Customer Name": "Bolt", Email: "b@bolt.co" }],
};

const mapping = {
  mode: "create" as const,
  columns: [{ sourceHeader: "Customer Name", targetField: "customer_name", required: true }],
};

describe("ImportsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.membership.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(membership);
    (prisma.dataImportJob.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "job-1", tenantId: "tenant-1", companyId: "company-1", kind: "customers", stage: "PRE_IMPORT",
      fileMetadata: null, mapping: null, validation: null, summary: null, errorRowsUrl: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"), updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    (prisma.dataImportJob.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.dataImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "job-1", tenantId: "tenant-1", companyId: "company-1", kind: "customers", stage: "PRE_IMPORT",
      fileMetadata: null, mapping: null, validation: null, summary: null, errorRowsUrl: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"), updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    (prisma.dataImportJob.update as ReturnType<typeof vi.fn>).mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      id: "job-1", tenantId: "tenant-1", companyId: "company-1", kind: "customers",
      stage: args.data.stage ?? "PRE_IMPORT", fileMetadata: null, mapping: null, validation: null, summary: null,
      errorRowsUrl: null, createdAt: new Date("2026-01-01T00:00:00.000Z"), updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    }));
  });

  const createService = () => new ImportsService({ add: vi.fn(async () => ({})) } as never);

  describe("create", () => {
    it("creates a PRE_IMPORT job under the resolved tenant", async () => {
      const service = createService();
      const job = await service.create({ kind: "customers" }, "user-1", meta);

      expect(prisma.dataImportJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tenantId: "tenant-1", kind: "customers", stage: "PRE_IMPORT", initiatedById: "user-1" }),
      });
      expect(job.id).toBe("job-1");
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it("throws when no provisioned tenant exists", async () => {
      (prisma.membership.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(createService().create({ kind: "customers" }, "user-1", meta)).rejects.toMatchObject({
        code: ErrorCode.TENANT_NOT_READY,
      });
    });
  });

  describe("list", () => {
    it("returns jobs without the full row payload", async () => {
      (prisma.dataImportJob.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{
        id: "job-1", tenantId: "tenant-1", companyId: "company-1", kind: "customers", stage: "UPLOAD",
        fileMetadata, mapping: null, validation: null, summary: null, errorRowsUrl: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"), updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      }]);

      const { items } = await createService().list("user-1");

      expect(items).toHaveLength(1);
      expect(items[0].fileMetadata?.rows).toEqual([]);
      expect(items[0].fileMetadata?.preview).toHaveLength(1);
    });
  });

  describe("templates", () => {
    it("returns all import templates", async () => {
      const { items } = await createService().templates();
      expect(items.some((template) => template.kind === "customers")).toBe(true);
      expect(items.some((template) => template.kind === "items")).toBe(true);
    });
  });

  describe("templateCsv", () => {
    it("builds a csv for a known template", () => {
      expect(createService().templateCsv("customers")).toContain("Customer Name");
    });

    it("rejects unknown templates", () => {
      expect(() => createService().templateCsv("nope")).toThrow(ApiException);
    });
  });

  describe("upload", () => {
    it("parses the file and moves the job to UPLOAD", async () => {
      const service = createService();
      const updated = await service.upload("job-1", {
        filename: "customers.csv", size: 42, buffer: Buffer.from("Customer Name,Email\nAcme,a@acme.co\nBolt,b@bolt.co\n", "utf-8"),
      }, "user-1", meta);

      expect(prisma.dataImportJob.update).toHaveBeenCalledWith({
        where: { id: "job-1" },
        data: expect.objectContaining({ stage: "UPLOAD", fileMetadata: expect.objectContaining({ totalRows: 2 }) }),
      });
      expect(updated.stage).toBe("UPLOAD");
    });

    it("rejects unsupported file types", async () => {
      await expect(createService().upload("job-1", { filename: "data.txt", size: 10, buffer: Buffer.from("a\n") }, "user-1", meta))
        .rejects.toMatchObject({ code: ErrorCode.IMPORT_TEMPLATE_INVALID });
    });

    it("blocks uploads after execution", async () => {
      (prisma.dataImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "job-1", tenantId: "tenant-1", companyId: "company-1", kind: "customers", stage: "COMPLETED",
        fileMetadata: null, mapping: null, validation: null, summary: null, errorRowsUrl: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"), updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      await expect(createService().upload("job-1", { filename: "customers.csv", size: 1, buffer: Buffer.from("a") }, "user-1", meta))
        .rejects.toMatchObject({ code: ErrorCode.IMPORT_IN_PROGRESS });
    });
  });

  describe("saveMapping", () => {
    it("persists a valid mapping", async () => {
      const updated = await createService().saveMapping("job-1", mapping, "user-1", meta);

      expect(prisma.dataImportJob.update).toHaveBeenCalledWith({
        where: { id: "job-1" },
        data: expect.objectContaining({ stage: "MAPPING", mapping }),
      });
      expect(updated.stage).toBe("MAPPING");
    });

    it("rejects mappings with unknown target fields", async () => {
      await expect(createService().saveMapping("job-1", {
        mode: "create", columns: [{ sourceHeader: "Name", targetField: "bogus", required: false }],
      }, "user-1", meta)).rejects.toMatchObject({ code: ErrorCode.IMPORT_MAPPING_INVALID });
    });
  });

  describe("validation", () => {
    it("computes and persists the validation result", async () => {
      (prisma.dataImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "job-1", tenantId: "tenant-1", companyId: "company-1", kind: "customers", stage: "MAPPING",
        fileMetadata, mapping, validation: null, summary: null, errorRowsUrl: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"), updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      const result = await createService().validation("job-1", "user-1");

      expect(result.summary).toEqual({ totalRows: 2, created: 2, updated: 0, skipped: 0, failed: 0, warnings: 0 });
      expect(prisma.dataImportJob.update).toHaveBeenCalledWith({
        where: { id: "job-1" },
        data: expect.objectContaining({ stage: "VALIDATION", summary: expect.objectContaining({ created: 2 }) }),
      });
    });

    it("requires a file and mapping", async () => {
      await expect(createService().validation("job-1", "user-1")).rejects.toMatchObject({ code: ErrorCode.UNPROCESSABLE });
    });
  });

  describe("execute", () => {
    it("marks the job IMPORT and enqueues it", async () => {
      const queue = { add: vi.fn(async () => ({})) };
      const service = new ImportsService(queue as never);
      (prisma.dataImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "job-1", tenantId: "tenant-1", companyId: "company-1", kind: "customers", stage: "MAPPING",
        fileMetadata, mapping, validation: null, summary: null, errorRowsUrl: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"), updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      await service.execute("job-1", "user-1", meta);

      expect(prisma.dataImportJob.update).toHaveBeenCalledWith({ where: { id: "job-1" }, data: { stage: "IMPORT" } });
      expect(queue.add).toHaveBeenCalledWith("import", { importId: "job-1", tenantId: "tenant-1" });
    });

    it("blocks re-execution of a completed import", async () => {
      (prisma.dataImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "job-1", tenantId: "tenant-1", companyId: "company-1", kind: "customers", stage: "COMPLETED",
        fileMetadata, mapping, validation: null, summary: null, errorRowsUrl: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"), updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      await expect(createService().execute("job-1", "user-1", meta)).rejects.toMatchObject({ code: ErrorCode.IMPORT_IN_PROGRESS });
    });
  });

  describe("summary", () => {
    it("returns the summary once completed", async () => {
      (prisma.dataImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "job-1", tenantId: "tenant-1", companyId: "company-1", kind: "customers", stage: "COMPLETED",
        fileMetadata, mapping, validation: { issues: [] }, summary: { totalRows: 2, created: 2, updated: 0, skipped: 0, failed: 0, warnings: 0 },
        errorRowsUrl: null, createdAt: new Date("2026-01-01T00:00:00.000Z"), updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      const result = await createService().summary("job-1", "user-1");
      expect(result.summary.created).toBe(2);
    });

    it("throws while the import has not completed", async () => {
      await expect(createService().summary("job-1", "user-1")).rejects.toMatchObject({ code: ErrorCode.IMPORT_IN_PROGRESS });
    });
  });

  describe("rollback", () => {
    it("resets the job to PRE_IMPORT", async () => {
      (prisma.dataImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "job-1", tenantId: "tenant-1", companyId: "company-1", kind: "customers", stage: "VALIDATION",
        fileMetadata, mapping, validation: { issues: [] }, summary: null, errorRowsUrl: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"), updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      await createService().rollback("job-1", "user-1", meta);

      expect(prisma.dataImportJob.update).toHaveBeenCalledWith({
        where: { id: "job-1" },
        data: expect.objectContaining({ stage: "PRE_IMPORT", mapping: "JSON_NULL", validation: "JSON_NULL", summary: "JSON_NULL", errorRowsUrl: null }),
      });
    });

    it("blocks rollback while running", async () => {
      (prisma.dataImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "job-1", tenantId: "tenant-1", companyId: "company-1", kind: "customers", stage: "IMPORT",
        fileMetadata, mapping, validation: null, summary: null, errorRowsUrl: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"), updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      await expect(createService().rollback("job-1", "user-1", meta)).rejects.toMatchObject({ code: ErrorCode.IMPORT_IN_PROGRESS });
    });
  });

  describe("get", () => {
    it("returns 404 for a job outside the tenant", async () => {
      (prisma.dataImportJob.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(createService().get("job-x", "user-1")).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });
  });
});
