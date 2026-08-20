import { describe, expect, it, vi } from "vitest";

import { HealthController } from "./health.controller";
import type { HealthReport, HealthService } from "./health.service";

const report = (status: HealthReport["status"]): HealthReport => ({
  status,
  service: "amni-api",
  version: "test",
  time: "2026-08-19T00:00:00.000Z",
  db: status === "ok" ? "ok" : "error",
  redis: "ok",
});

describe("HealthController", () => {
  it("returns a dependency-free liveness response", () => {
    const controller = new HealthController({} as HealthService);
    expect(controller.live()).toMatchObject({ status: "ok", service: "amni-api" });
  });

  it("sets 503 when a readiness dependency is degraded", async () => {
    const health = { check: vi.fn().mockResolvedValue(report("degraded")) } as unknown as HealthService;
    const response = { status: vi.fn() };
    const controller = new HealthController(health);

    await expect(controller.ready(response as never)).resolves.toMatchObject({ status: "degraded" });
    expect(response.status).toHaveBeenCalledWith(503);
  });

  it("keeps readiness successful when all dependencies are healthy", async () => {
    const health = { check: vi.fn().mockResolvedValue(report("ok")) } as unknown as HealthService;
    const response = { status: vi.fn() };
    const controller = new HealthController(health);

    await expect(controller.ready(response as never)).resolves.toMatchObject({ status: "ok" });
    expect(response.status).not.toHaveBeenCalled();
  });
});
