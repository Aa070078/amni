import type { Logger } from "@nestjs/common";
import type { Prisma } from "@amni/db";
import { prisma, type Company, type ProvisioningJob, type Tenant } from "@amni/db";
import { createErpClientForTenant, encryptServiceSecret, serializeServiceCredentials } from "@amni/erp";

import type { ProvisioningContext, ProvisioningDriver, StepResult } from "./drivers/provisioning-driver";

const STEP_ORDER = [
  "preflight",
  "create_site",
  "configure",
  "service_account",
  "tenant_admins",
  "validate",
  "activate",
] as const;

type StepKey = (typeof STEP_ORDER)[number];

type JobState = ProvisioningJob["state"];

interface StepState {
  key: string;
  status: "pending" | "running" | "done" | "failed" | "skipped";
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

/** Tenant status to move into before each step starts. */
const STEP_TENANT_STATUS: Record<StepKey, Tenant["status"]> = {
  preflight: "PROVISIONING",
  create_site: "PROVISIONING",
  configure: "CONFIGURING",
  service_account: "CONFIGURING",
  tenant_admins: "CONFIGURING",
  validate: "VALIDATING",
  activate: "VALIDATING",
};

/** Terminal job state when a step fails (ARCHITECTURE §6.1). */
const STEP_FAILURE_STATE: Record<StepKey, JobState> = {
  preflight: "PROVISIONING_FAILED",
  create_site: "PROVISIONING_FAILED",
  configure: "CONFIGURATION_FAILED",
  service_account: "CONFIGURATION_FAILED",
  tenant_admins: "CONFIGURATION_FAILED",
  validate: "VALIDATION_FAILED",
  activate: "VALIDATION_FAILED",
};

const RUNNING_STATES: JobState[] = ["CREATED", "QUEUED", "PROVISIONING", "CONFIGURING", "VALIDATING"];
const COMPLETE_STATES: JobState[] = ["READY", "ACTIVE", "CANCELLED"];

const STEP_RUNNERS: Record<Exclude<StepKey, "activate">, (driver: ProvisioningDriver, ctx: ProvisioningContext) => Promise<StepResult>> = {
  preflight: (driver, ctx) => driver.preflight(ctx),
  create_site: (driver, ctx) => driver.createSite(ctx),
  configure: (driver, ctx) => driver.configureCompany(ctx),
  service_account: (driver, ctx) => driver.createServiceAccount(ctx),
  tenant_admins: (driver, ctx) => driver.createTenantAdmins(ctx),
  validate: (driver, ctx) => driver.validate(ctx),
};

export interface ProvisioningParams {
  jobId: string;
  tenantId: string;
  driver: ProvisioningDriver;
  logger: Logger;
  now?: () => Date;
}

/**
 * Drives the provisioning state machine for one BullMQ job:
 *
 *   CREATED → QUEUED → PROVISIONING → CONFIGURING → VALIDATING → READY (tenant ACTIVE)
 *
 * Idempotent by design: steps already `done` in the persisted `steps` trail
 * are skipped on retry, and each driver step checks real ERP state before
 * acting. A step failure records the terminal failure state + error, marks
 * the tenant FAILED and throws so BullMQ re-queues with backoff.
 */
export async function runProvisioningJob(params: ProvisioningParams): Promise<{ finished: boolean }> {
  const { jobId, tenantId, driver, logger } = params;
  const now = params.now ?? (() => new Date());

  const record = await prisma.provisioningJob.findUnique({
    where: { id: jobId },
    include: { tenant: { include: { company: true } } },
  });

  if (!record) {
    throw new Error(`provisioning job ${jobId} not found`);
  }
  const tenant = record.tenant;

  if (COMPLETE_STATES.includes(record.state) || tenant.status === "ACTIVE") {
    logger.log(`provisioning job ${jobId}: already ${record.state}, skipping`);
    return { finished: true };
  }

  const active = await prisma.provisioningJob.findFirst({
    where: { tenantId, id: { not: jobId }, state: { in: RUNNING_STATES } },
  });
  if (active) {
    logger.warn(`provisioning job ${jobId}: job ${active.id} already running for tenant ${tenantId}`);
    return { finished: true };
  }

  const doneKeys = new Set(
    asSteps(record.steps)
      .filter((step) => step.status === "done")
      .map((step) => step.key),
  );

  await prisma.provisioningJob.update({
    where: { id: jobId },
    data: { state: "PROVISIONING", attempts: record.attempts + 1, runAt: now(), startedAt: now() },
  });
  await prisma.tenant.update({ where: { id: tenantId }, data: { status: "PROVISIONING" } });

  const ctx = buildContext(tenant, record);

  for (const key of STEP_ORDER) {
    if (doneKeys.has(key)) {
      logger.log(`provisioning job ${jobId}: step ${key} already done, skipping`);
      continue;
    }

    await markStepRunning(jobId, tenantId, key, now);

    if (key === "activate") {
      await prisma.provisioningJob.update({ where: { id: jobId }, data: { state: "READY", finishedAt: now() } });
      await prisma.tenant.update({ where: { id: tenantId }, data: { status: "ACTIVE" } });
      await prisma.eRPInstance.updateMany({
        where: { tenantId },
        data: { health: "HEALTHY", lastHealthCheckAt: now() },
      });
      await markStepDone(jobId, key, now);
      logger.log(`provisioning job ${jobId}: READY`);
      continue;
    }

    logger.log(`provisioning job ${jobId}: step ${key} start`);
    try {
      const result = await STEP_RUNNERS[key](driver, ctx);
      if (!result.ok) {
        throw new Error(result.detail ?? `step ${key} failed`);
      }
      if (key === "validate" && driver.name === "bench") {
        const client = await createErpClientForTenant({ tenantId, requestId: `provision:${jobId}` });
        const loggedUser = await client.call<string>("frappe.auth.get_logged_user");
        if (loggedUser.toLowerCase() !== ctx.serviceAccountEmail.toLowerCase()) {
          throw new Error("ERP service credentials authenticated as an unexpected user");
        }
        await client.list<{ name: string }>("Company", { fields: ["name"], limitPageLength: 1 });
      }
      await afterStep(jobId, tenantId, key, result);
      await markStepDone(jobId, key, now);
      logger.log(`provisioning job ${jobId}: step ${key} done`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`provisioning job ${jobId}: step ${key} failed: ${message}`);
      await failStep(jobId, tenantId, key, message, now);
      throw new Error(message);
    }
  }

  return { finished: true };
}

async function afterStep(
  jobId: string,
  tenantId: string,
  key: StepKey,
  result: StepResult,
): Promise<void> {
  if (key === "create_site") {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { hrmsInstalled: (result.installApps ?? []).includes("hrms") },
    });
    return;
  }

  if (key !== "service_account" || !result.host || !result.serviceCredentials) return;

  const serviceKeyCipher = encryptServiceSecret(
    serializeServiceCredentials(result.serviceCredentials.apiKey, result.serviceCredentials.apiSecret),
  );

  const existing = await prisma.eRPInstance.findUnique({ where: { tenantId } });
  if (existing) {
    await prisma.eRPInstance.update({
      where: { id: existing.id },
      data: { host: result.host, serviceKeyCipher },
    });
  } else {
    await prisma.eRPInstance.create({
      data: {
        tenantId,
        host: result.host,
        cluster: "default",
        capacityGroup: "shared",
        health: "UNKNOWN",
        serviceKeyCipher,
      },
    });
  }
}

async function markStepRunning(jobId: string, tenantId: string, key: StepKey, now: () => Date): Promise<void> {
  await prisma.tenant.update({ where: { id: tenantId }, data: { status: STEP_TENANT_STATUS[key] } });
  await updateStep(jobId, key, { status: "running", startedAt: now().toISOString() });
}

async function markStepDone(jobId: string, key: StepKey, now: () => Date): Promise<void> {
  await updateStep(jobId, key, { status: "done", finishedAt: now().toISOString() });
}

async function failStep(jobId: string, tenantId: string, key: StepKey, message: string, now: () => Date): Promise<void> {
  await updateStep(jobId, key, { status: "failed", error: message, finishedAt: now().toISOString() });
  await prisma.provisioningJob.update({
    where: { id: jobId },
    data: { state: STEP_FAILURE_STATE[key], lastError: message, finishedAt: now() },
  });
  await prisma.tenant.update({ where: { id: tenantId }, data: { status: "FAILED" } });
}

async function updateStep(jobId: string, key: string, patch: Partial<StepState>): Promise<void> {
  const record = await prisma.provisioningJob.findUnique({ where: { id: jobId }, select: { steps: true } });
  const steps: StepState[] = record ? asSteps(record.steps) : [];
  const current = steps.find((step) => step.key === key);
  if (current) {
    current.status = patch.status ?? current.status;
    current.startedAt = patch.startedAt;
    current.finishedAt = patch.finishedAt;
    current.error = patch.error;
  } else {
    steps.push({ key, status: "pending", ...patch });
  }
  await prisma.provisioningJob.update({
    where: { id: jobId },
    data: { steps: steps as unknown as Prisma.InputJsonValue },
  });
}

function buildContext(tenant: Tenant & { company: Company }, _record: ProvisioningJob): ProvisioningContext {
  const locale = (tenant.locale ?? {}) as {
    currency?: string;
    timezone?: string;
    dateFormat?: string;
    numberFormat?: string;
    language?: string;
    country?: string;
  };
  return {
    tenantId: tenant.id,
    siteName: tenant.siteName,
    siteUrl: tenant.siteUrl,
    companyName: tenant.company.name,
    companyAbbreviation: tenant.company.name.slice(0, 5).toUpperCase(),
    country: locale.country ?? tenant.company.country ?? "US",
    currency: locale.currency ?? "USD",
    timezone: locale.timezone ?? "UTC",
    dateFormat: locale.dateFormat ?? "YYYY-MM-DD",
    numberFormat: locale.numberFormat ?? "1,000.00",
    language: locale.language ?? "en",
    serviceAccountEmail: `amni-integration+${tenant.siteName}@amni.local`,
  };
}

function asSteps(value: unknown): StepState[] {
  return Array.isArray(value) ? (value as StepState[]) : [];
}
