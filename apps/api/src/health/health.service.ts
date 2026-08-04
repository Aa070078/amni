import { Injectable } from "@nestjs/common";

export interface HealthReport {
  status: "ok";
  service: string;
  version: string;
  time: string;
  db: "ok" | "error";
  redis: "ok" | "error";
}

@Injectable()
export class HealthService {
  async check(): Promise<HealthReport> {
    const [db, redis] = await Promise.all([this.checkDb(), this.checkRedis()]);
    return {
      status: "ok",
      service: "amni-api",
      version: process.env.APP_VERSION ?? "dev",
      time: new Date().toISOString(),
      db,
      redis,
    };
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
