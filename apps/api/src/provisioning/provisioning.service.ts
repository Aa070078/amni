import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { prisma } from "@amni/db";
import { BullQueue, ErrorCode, type ProvisioningStatus, type ProvisioningStep } from "@amni/shared";
import type { Queue } from "bullmq";

import { ApiException } from "../common/api.exception";

const TERMINAL_FAILED = new Set(["PROVISIONING_FAILED", "CONFIGURATION_FAILED", "VALIDATION_FAILED"]);

export interface EnqueueInput {
  tenantId: string;
  companyId: string;
  createdBy: string;
  siteName: string;
  siteUrl: string;
}

/**
 * Job lifecycle: create/reset a `ProvisioningJob` row (idempotent by tenant),
 * enqueue it on the `provisioning` BullMQ queue. The worker drives the state
 * machine; nothing here runs long work inline.
 */
@Injectable()
export class ProvisioningService {
  constructor(@InjectQueue(BullQueue.PROVISIONING) private readonly queue: Queue) {}

  async enqueue(input: EnqueueInput): Promise<{ jobId: string }> {
    const idempotencyKey = `provision:${input.tenantId}`;
    const existing = await prisma.provisioningJob.findUnique({ where: { idempotencyKey } });

    if (existing && !TERMINAL_FAILED.has(existing.state)) {
      return { jobId: existing.id };
    }

    const attempts = existing ? existing.attempts + 1 : 0;
    const job = existing
      ? await prisma.provisioningJob.update({
          where: { id: existing.id },
          data: {
            state: "QUEUED",
            attempts,
            steps: [],
            logs: [],
            lastError: null,
            runAt: null,
            startedAt: null,
            finishedAt: null,
          },
        })
      : await prisma.provisioningJob.create({
          data: {
            tenantId: input.tenantId,
            type: "PROVISION",
            state: "QUEUED",
            attempts,
            createdBy: input.createdBy,
            idempotencyKey,
          },
        });

    await prisma.tenant.update({ where: { id: input.tenantId }, data: { status: "CREATING" } });

    await prisma.auditLog.create({
      data: {
        actorId: input.createdBy,
        action: "provisioning.enqueue",
        resourceType: "provisioning_job",
        resourceId: job.id,
        metadata: { tenantId: input.tenantId, siteName: input.siteName },
      },
    });

    await this.queue.add(
      "provision",
      { jobId: job.id, tenantId: input.tenantId, idempotencyKey },
      { jobId: job.id, attempts: 5, backoff: { type: "exponential", delay: 5_000 } },
    );

    return { jobId: job.id };
  }

  async statusFor(userId: string): Promise<ProvisioningStatus> {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: {
        company: {
          include: {
            tenant: { include: { provisioningJobs: { orderBy: { createdAt: "desc" }, take: 1 } } },
          },
        },
      },
    });

    const tenant = membership?.company?.tenant;
    if (!tenant) {
      return { tenantStatus: "CREATING", steps: [], attempts: 0 };
    }

    const job = tenant.provisioningJobs[0];
    if (!job) {
      return { tenantStatus: tenant.status, steps: [], attempts: 0 };
    }

    return {
      tenantStatus: tenant.status,
      jobState: job.state,
      steps: job.steps as unknown as ProvisioningStep[],
      attempts: job.attempts,
      lastError: job.lastError ?? undefined,
      startedAt: job.startedAt?.toISOString(),
      finishedAt: job.finishedAt?.toISOString(),
    };
  }

  async assertReady(userId: string): Promise<void> {
    const status = await this.statusFor(userId);
    if (status.tenantStatus !== "ACTIVE") {
      throw new ApiException({
        code: ErrorCode.TENANT_NOT_READY,
        status: 409,
        message: "Workspace is not provisioned yet",
      });
    }
  }
}
