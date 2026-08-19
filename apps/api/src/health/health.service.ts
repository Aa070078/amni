import { Injectable } from "@nestjs/common";
import { prisma } from "@amni/db";
import { createErpClientForTenant } from "@amni/erp";
import { ErrorCode } from "@amni/shared";

import { ApiException } from "../common/api.exception";

export interface HealthReport {
  status: "ok" | "degraded";
  service: string;
  version: string;
  time: string;
  db: "ok" | "error";
  redis: "ok" | "error";
}

export interface TenantHealthReport {
  status: "healthy" | "degraded" | "unreachable" | "unknown";
  checkedAt: string;
  latencyMs?: number;
}

@Injectable()
export class HealthService {
  async check(): Promise<HealthReport> {
    const [db, redis] = await Promise.all([this.checkDb(), this.checkRedis()]);
    return {
      status: db === "ok" && redis === "ok" ? "ok" : "degraded",
      service: "amni-api",
      version: process.env.APP_VERSION ?? "dev",
      time: new Date().toISOString(),
      db,
      redis,
    };
  }

  async checkTenant(userId: string, requestId?: string): Promise<TenantHealthReport> {
    const tenant = await prisma.tenant.findFirst({
      where: { company: { memberships: { some: { userId, status: "ACTIVE" } } } },
      select: { id: true, erpInstance: { select: { id: true, health: true, lastHealthCheckAt: true } } },
    });
    if (!tenant?.erpInstance) {
      throw new ApiException({ code: ErrorCode.TENANT_NOT_READY, status: 409, message: "Workspace ERP is not provisioned" });
    }

    const started = Date.now();
    const checkedAt = new Date();
    try {
      const client = await createErpClientForTenant({ tenantId: tenant.id, requestId });
      await client.call<string>("frappe.auth.get_logged_user");
      const latencyMs = Date.now() - started;
      const health = latencyMs > 5_000 ? "DEGRADED" : "HEALTHY";
      await prisma.eRPInstance.update({ where: { id: tenant.erpInstance.id }, data: { health, lastHealthCheckAt: checkedAt } });
      return { status: health.toLowerCase() as "healthy" | "degraded", checkedAt: checkedAt.toISOString(), latencyMs };
    } catch {
      await prisma.eRPInstance.update({ where: { id: tenant.erpInstance.id }, data: { health: "UNREACHABLE", lastHealthCheckAt: checkedAt } });
      return { status: "unreachable", checkedAt: checkedAt.toISOString() };
    }
  }

  private async checkDb(): Promise<"ok" | "error"> {
    try {
      const { prisma } = await import("@amni/db");
      await prisma.$queryRaw`SELECT 1`;
      return "ok";
    } catch {
      return "error";
    }
  }

  private async checkRedis(): Promise<"ok" | "error"> {
    try {
      const mod = await import("ioredis");
      const IORedis = (mod.default ?? mod) as unknown as new (
        url: string,
        opts?: Record<string, unknown>,
      ) => { ping(): Promise<string>; disconnect(): Promise<void> };
      const client = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 1500,
      });
      await client.ping();
      await client.disconnect();
      return "ok";
    } catch {
      return "error";
    }
  }
}
