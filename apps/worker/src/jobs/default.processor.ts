import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { BullQueue } from "@amni/shared";
import { prisma } from "@amni/db";
import { createErpClientForTenant } from "@amni/erp";
import type { Job } from "bullmq";

@Processor(BullQueue.DEFAULT)
export class DefaultProcessor extends WorkerHost {
  private readonly logger = new Logger(DefaultProcessor.name);

  async process(job: Job) {
    if (job.name !== "tenant-health") {
      this.logger.warn(`ignored unknown default job ${job.name} (${job.id})`);
      return;
    }
    const cutoff = new Date(Date.now() - 4 * 60_000);
    const instances = await prisma.eRPInstance.findMany({
      where: { tenant: { status: "ACTIVE" }, OR: [{ lastHealthCheckAt: null }, { lastHealthCheckAt: { lt: cutoff } }] },
      select: { id: true, tenantId: true },
      orderBy: { lastHealthCheckAt: "asc" },
      take: 25,
    });
    for (const instance of instances) {
      const started = Date.now();
      const checkedAt = new Date();
      try {
        const client = await createErpClientForTenant({ tenantId: instance.tenantId, requestId: `health:${job.id}` });
        await client.call<string>("frappe.auth.get_logged_user");
        await prisma.eRPInstance.update({ where: { id: instance.id }, data: { health: Date.now() - started > 5_000 ? "DEGRADED" : "HEALTHY", lastHealthCheckAt: checkedAt } });
      } catch (error) {
        await prisma.eRPInstance.update({ where: { id: instance.id }, data: { health: "UNREACHABLE", lastHealthCheckAt: checkedAt } });
        this.logger.warn(`tenant health check failed for ${instance.tenantId}: ${error instanceof Error ? error.message : "unknown error"}`);
      }
    }
  }
}
