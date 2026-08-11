import type { ProvisioningContext, ProvisioningDriver, StepResult } from "./provisioning-driver";

/**
 * Simulated provisioning driver for local dev, CI and tests: every step
 * succeeds with a trace entry (and a synthetic service key) so the full
 * state machine can be exercised without the frappe_docker cluster.
 * Set `PROVISIONING_SIMULATE_FAIL_STEP` to a step key to exercise the
 * failure/retry path deterministically.
 */
export class SimulationDriver implements ProvisioningDriver {
  readonly name = "simulate";

  constructor(private readonly failStep?: string) {}

  private async result(ctx: ProvisioningContext, step: string): Promise<StepResult> {
    if (this.failStep === step) {
      return { ok: false, detail: `simulated failure at step ${step}` };
    }
    return { ok: true, detail: `simulated: ${step} (${ctx.siteName})` };
  }

  async preflight(ctx: ProvisioningContext): Promise<StepResult> {
    return this.result(ctx, "preflight");
  }

  async createSite(ctx: ProvisioningContext): Promise<StepResult> {
    return this.result(ctx, "create_site");
  }

  async configureCompany(ctx: ProvisioningContext): Promise<StepResult> {
    return this.result(ctx, "configure");
  }

  async createServiceAccount(ctx: ProvisioningContext): Promise<StepResult> {
    if (this.failStep === "service_account") {
      return { ok: false, detail: "simulated failure at step service_account" };
    }
    return {
      ok: true,
      detail: `simulated: service_account (${ctx.serviceAccountEmail})`,
      host: ctx.siteUrl,
      serviceKey: `sim:${ctx.tenantId}`,
    };
  }

  async createTenantAdmins(ctx: ProvisioningContext): Promise<StepResult> {
    return this.result(ctx, "tenant_admins");
  }

  async validate(ctx: ProvisioningContext): Promise<StepResult> {
    return this.result(ctx, "validate");
  }
}
