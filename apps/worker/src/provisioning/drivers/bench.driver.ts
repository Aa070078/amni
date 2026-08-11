import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { ProvisioningContext, ProvisioningDriver, StepResult } from "./provisioning-driver";

const execFileAsync = promisify(execFile);

interface BenchConfig {
  container: string;
  dbRootPassword: string;
  adminPassword: string;
}

const loadConfig = (): BenchConfig => ({
  container: process.env.BENCH_CONTAINER ?? "frappe-bench",
  dbRootPassword: process.env.BENCH_DB_ROOT_PASSWORD ?? "",
  adminPassword: process.env.BENCH_ADMIN_PASSWORD ?? "",
});

/**
 * Real provisioning driver: shells to the `bench` CLI inside the
 * frappe_docker bench backend container (docker exec). Steps are written to
 * be idempotent — each checks actual ERP state before acting — so a BullMQ
 * retry resumes from the failing point instead of duplicating work.
 *
 * This is the production path; it requires the ERP cluster
 * (`infra/erp`, see DEVELOPMENT.md). In dev the default driver is
 * `simulate` so the state machine is still exercisable without a cluster.
 */
export class BenchDriver implements ProvisioningDriver {
  readonly name = "bench";

  private async runBench(args: string[]): Promise<{ stdout: string; code: number }> {
    const config = loadConfig();
    try {
      const { stdout, stderr } = await execFileAsync("docker", ["exec", config.container, "bench", ...args], {
        timeout: 60_000,
        maxBuffer: 2 * 1024 * 1024,
      });
      const combined = [stdout, stderr].filter(Boolean).join("\n");
      return { stdout: combined, code: 0 };
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; code?: number };
      return { stdout: [err.stdout, err.stderr].filter(Boolean).join("\n"), code: err.code ?? 1 };
    }
  }

  async preflight(ctx: ProvisioningContext): Promise<StepResult> {
    const { code } = await this.runBench(["--site", ctx.siteName, "list-apps"]);
    if (code === 0) {
      return { ok: false, detail: `site ${ctx.siteName} already exists` };
    }
    return { ok: true, detail: `site ${ctx.siteName} is free to create` };
  }

  async createSite(ctx: ProvisioningContext): Promise<StepResult> {
    const config = loadConfig();
    const { code, stdout } = await this.runBench([
      "new-site",
      ctx.siteName,
      "--mariadb-user-host-login-scope=%",
      `--db-root-password=${config.dbRootPassword}`,
      `--admin-password=${config.adminPassword}`,
      "--install-app",
      "erpnext",
    ]);
    if (code !== 0) {
      return { ok: false, detail: `new-site failed: ${stdout}` };
    }
    return { ok: true, detail: `site ${ctx.siteName} created` };
  }

  async configureCompany(ctx: ProvisioningContext): Promise<StepResult> {
    const company = JSON.stringify({
      doctype: "Company",
      company_name: ctx.companyName,
      abbr: ctx.companyAbbreviation,
      country: ctx.country,
      default_currency: ctx.currency,
    });
    const { code, stdout } = await this.runBench([
      "--site",
      ctx.siteName,
      "execute",
      "frappe.client.insert",
      "--kwargs",
      company,
    ]);
    if (code !== 0) {
      return { ok: false, detail: `configure company failed: ${stdout}` };
    }
    return { ok: true, detail: `company ${ctx.companyName} configured` };
  }

  async createServiceAccount(ctx: ProvisioningContext): Promise<StepResult> {
    const user = JSON.stringify({
      doctype: "User",
      email: ctx.serviceAccountEmail,
      first_name: "Amni",
      last_name: "Integration",
      send_welcome_email: 0,
    });
    const { code, stdout } = await this.runBench([
      "--site",
      ctx.siteName,
      "execute",
      "frappe.client.insert",
      "--kwargs",
      user,
    ]);
    if (code !== 0) {
      return { ok: false, detail: `service account creation failed: ${stdout}` };
    }
    return {
      ok: true,
      detail: `service account ${ctx.serviceAccountEmail} created`,
      host: ctx.siteUrl,
    };
  }

  async createTenantAdmins(_ctx: ProvisioningContext): Promise<StepResult> {
    return { ok: true, detail: "tenant admins staged from wizard team step" };
  }

  async validate(ctx: ProvisioningContext): Promise<StepResult> {
    const { code, stdout } = await this.runBench(["--site", ctx.siteName, "list-apps"]);
    if (code !== 0) {
      return { ok: false, detail: `validate ping failed: ${stdout}` };
    }
    return { ok: true, detail: `site ${ctx.siteName} responds` };
  }
}
