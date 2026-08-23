import { Logger } from "@nestjs/common";
import { decryptServiceSecret } from "@amni/erp";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SimulationDriver } from "./drivers/simulate.driver";
import { runProvisioningJob } from "./state-machine";

type JobRecord = {
  id: string;
  tenantId: string;
  state: string;
  attempts: number;
  steps: unknown;
  logs: unknown;
  lastError?: string;
  runAt?: unknown;
  startedAt?: unknown;
  finishedAt?: unknown;
  tenant: {
    id: string;
    status: string;
    siteName: string;
    siteUrl: string;
    locale: unknown;
    planTier: string;
    company: { name: string; country: string };
  };
};

let jobRecord: JobRecord;
let tenantStatus: string;
let erpRecord: unknown;

vi.mock("@amni/db", () => ({
  prisma: {
    provisioningJob: {
      findUnique: vi.fn(async () => jobRecord),
      findFirst: vi.fn(async () => null),
      update: vi.fn(async ({ data }: { data: Partial<JobRecord> }) => {
        jobRecord = { ...jobRecord, ...(data as never) };
        return jobRecord;
      }),
    },
    tenant: {
      update: vi.fn(async ({ data }: { data: { status: string } }) => {
        tenantStatus = data.status;
        return { id: "tenant-1", status: tenantStatus };
      }),
    },
    eRPInstance: {
      findUnique: vi.fn(async () => erpRecord),
      create: vi.fn(async ({ data }: { data: unknown }) => {
        erpRecord = data;
        return erpRecord;
      }),
      update: vi.fn(async ({ data }: { data: unknown }) => {
        erpRecord = { ...(erpRecord as object), ...(data as object) };
        return erpRecord;
      }),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
  },
}));

const FIXED_NOW = () => new Date("2026-01-01T00:00:00.000Z");
const TEST_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const freshRecord = (overrides: Partial<JobRecord> = {}): JobRecord => ({
  id: "job-1",
  tenantId: "tenant-1",
  state: "QUEUED",
  attempts: 0,
  steps: [],
  logs: [],
  tenant: {
    id: "tenant-1",
    status: "CREATING",
    siteName: "demo-co",
    siteUrl: "https://demo-co.amni.dev",
    locale: { currency: "GBP", timezone: "Europe/London", dateFormat: "DD-MM-YYYY", numberFormat: "1,000.00", language: "en", country: "GB" },
    planTier: "TRIAL",
    company: { name: "Demo Co.", country: "GB" },
  },
  ...overrides,
});

describe("runProvisioningJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobRecord = freshRecord();
    tenantStatus = "CREATING";
    erpRecord = null;
    process.env.ENCRYPTION_KEY = TEST_KEY;
  });

  const params = {
    jobId: "job-1",
    tenantId: "tenant-1",
    driver: new SimulationDriver(),
    logger: new Logger("state-machine.spec"),
    now: FIXED_NOW,
  };

  it("drives every step to READY and activates the tenant", async () => {
    const result = await runProvisioningJob(params);

    expect(result.finished).toBe(true);
    expect(jobRecord.state).toBe("READY");
    expect(tenantStatus).toBe("ACTIVE");
    const steps = jobRecord.steps as { key: string; status: string }[];
    expect(steps).toHaveLength(7);
    for (const step of steps) expect(step.status).toBe("done");
    expect(erpRecord).toMatchObject({ tenantId: "tenant-1", host: "http://127.0.0.1:8080" });
    expect(JSON.parse(decryptServiceSecret((erpRecord as { serviceKeyCipher: string }).serviceKeyCipher))).toEqual({
      apiKey: "demo-api-key",
      apiSecret: "demo-api-secret",
    });
  });

  it("resumes from the failing step instead of re-running done steps", async () => {
    jobRecord = freshRecord({
      state: "PROVISIONING_FAILED",
      attempts: 1,
      steps: [
        { key: "preflight", status: "done" },
        { key: "create_site", status: "failed", error: "simulated" },
      ],
    });

    const result = await runProvisioningJob(params);

    expect(result.finished).toBe(true);
    expect(jobRecord.state).toBe("READY");
    const steps = jobRecord.steps as { key: string; status: string }[];
    expect(steps.find((step) => step.key === "preflight")?.status).toBe("done");
    expect(steps.find((step) => step.key === "create_site")?.status).toBe("done");
    expect(tenantStatus).toBe("ACTIVE");
  });

  it("records a terminal failure state, marks the tenant FAILED and throws", async () => {
    await expect(
      runProvisioningJob({ ...params, driver: new SimulationDriver("configure") }),
    ).rejects.toThrow(/configure/);

    expect(jobRecord.state).toBe("CONFIGURATION_FAILED");
    expect(jobRecord.lastError).toMatch(/configure/);
    expect(tenantStatus).toBe("FAILED");
    const failedStep = (jobRecord.steps as { key: string; status: string }[]).find((step) => step.key === "configure");
    expect(failedStep?.status).toBe("failed");
  });

  it("skips work when the tenant is already active", async () => {
    jobRecord = freshRecord({ state: "ACTIVE" });
    tenantStatus = "ACTIVE";

    const result = await runProvisioningJob(params);

    expect(result.finished).toBe(true);
    expect(jobRecord.state).toBe("ACTIVE");
  });
});
