import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { ProvisioningContext, ProvisioningDriver, StepResult } from "./provisioning-driver";

const execFileAsync = promisify(execFile);

interface BenchConfig {
  mode: "docker-exec" | "ssh";
  container: string;
  dbRootPassword: string;
  adminPassword: string;
  /** Apps installed on every new site, in order (e.g. `erpnext,hrms`). */
  installApps: string[];
  sshHost?: string;
  sshUser?: string;
  sshPort: number;
  sshKeyPath?: string;
  sshKnownHostsPath?: string;
}

const loadConfig = (): BenchConfig => {
  const requestedMode = process.env.ERPNEXT_CLUSTER_MODE ?? (process.env.NODE_ENV === "production" ? "ssh" : "docker-exec");
  if (requestedMode !== "docker-exec" && requestedMode !== "ssh") {
    throw new Error(`unsupported ERPNEXT_CLUSTER_MODE: ${requestedMode}`);
  }
  return {
    mode: requestedMode,
    container: process.env.ERPNEXT_BENCH_CONTAINER ?? process.env.BENCH_CONTAINER ?? "frappe-backend-1",
    dbRootPassword: process.env.BENCH_DB_ROOT_PASSWORD ?? (process.env.NODE_ENV === "production" ? "" : "admin"),
    adminPassword: process.env.BENCH_ADMIN_PASSWORD ?? (process.env.NODE_ENV === "production" ? "" : "admin"),
    installApps: (process.env.ERPNEXT_INSTALL_APPS ?? "erpnext,hrms,amni_bridge")
      .split(",")
      .map((app) => app.trim())
      .filter(Boolean),
    sshHost: process.env.ERPNEXT_SSH_HOST,
    sshUser: process.env.ERPNEXT_SSH_USER,
    sshPort: Number(process.env.ERPNEXT_SSH_PORT ?? 22),
    sshKeyPath: process.env.ERPNEXT_SSH_KEY_PATH,
    sshKnownHostsPath: process.env.ERPNEXT_SSH_KNOWN_HOSTS_PATH,
  };
};

const quoteRemoteArg = (value: string): string => `'${value.replaceAll("'", `'"'"'`)}'`;

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

  private async runBench(args: string[], timeout = 60_000): Promise<{ stdout: string; code: number }> {
    const config = loadConfig();
    const executable = config.mode === "ssh" ? "ssh" : "docker";
    let commandArgs: string[];
    if (config.mode === "ssh") {
      if (!config.sshHost || !config.sshUser || !config.sshKeyPath || !config.sshKnownHostsPath) {
        return { stdout: "ERP SSH host, user, key, and known-hosts file are required", code: 1 };
      }
      const remote = ["docker", "exec", config.container, "bench", ...args].map(quoteRemoteArg).join(" ");
      commandArgs = [
        "-i", config.sshKeyPath,
        "-p", String(config.sshPort),
        "-o", "BatchMode=yes",
        "-o", "IdentitiesOnly=yes",
        "-o", "StrictHostKeyChecking=yes",
        "-o", `UserKnownHostsFile=${config.sshKnownHostsPath}`,
        `${config.sshUser}@${config.sshHost}`,
        remote,
      ];
    } else {
      commandArgs = ["exec", config.container, "bench", ...args];
    }
    try {
      const { stdout, stderr } = await execFileAsync(executable, commandArgs, {
        timeout,
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
    const config = loadConfig();
    if (!config.dbRootPassword || !config.adminPassword) {
      return { ok: false, detail: "bench database-root and Administrator passwords are required" };
    }
    if (config.mode === "ssh" && (!config.sshHost || !config.sshUser || !config.sshKeyPath || !config.sshKnownHostsPath)) {
      return { ok: false, detail: "bench SSH host, user, private key, and pinned known-hosts file are required" };
    }
    const { code } = await this.runBench(["--site", ctx.siteName, "list-apps"]);
    if (code === 0) {
      return { ok: true, detail: `site ${ctx.siteName} already exists and will be repaired idempotently` };
    }
    return { ok: true, detail: `site ${ctx.siteName} is free to create` };
  }

  async createSite(ctx: ProvisioningContext): Promise<StepResult> {
    const config = loadConfig();
    const existing = await this.runBench(["--site", ctx.siteName, "list-apps"]);
    if (existing.code === 0) {
      for (const app of config.installApps) {
        if (!hasInstalledApp(existing.stdout, app)) {
          const install = await this.runBench(["--site", ctx.siteName, "install-app", app], 5 * 60_000);
          if (install.code !== 0) return { ok: false, detail: `install ${app} failed: ${install.stdout}` };
        }
      }
      return {
        ok: true,
        detail: `site ${ctx.siteName} already exists; required apps verified`,
        installApps: config.installApps,
      };
    }
    const installFlags = config.installApps.flatMap((app) => ["--install-app", app]);
    const { code, stdout } = await this.runBench([
      "new-site",
      ctx.siteName,
      "--mariadb-user-host-login-scope=%",
      `--db-root-password=${config.dbRootPassword}`,
      `--admin-password=${config.adminPassword}`,
      ...installFlags,
    ], 15 * 60_000);
    if (code !== 0) {
      return { ok: false, detail: `new-site failed: ${stdout}` };
    }
    return {
      ok: true,
      detail: `site ${ctx.siteName} created (apps: ${config.installApps.join(", ")})`,
      installApps: config.installApps,
    };
  }

  async configureCompany(ctx: ProvisioningContext): Promise<StepResult> {
    const { code, stdout } = await this.runBench([
      "--site",
      ctx.siteName,
      "execute",
      "amni_bridge.api.configure_company",
      "--kwargs",
      JSON.stringify({
        company_name: ctx.companyName,
        abbreviation: ctx.companyAbbreviation,
        country: ctx.country,
        currency: ctx.currency,
      }),
    ], 5 * 60_000);
    if (code !== 0) {
      return { ok: false, detail: `configure company failed: ${stdout}` };
    }
    return { ok: true, detail: `company ${ctx.companyName} configured` };
  }

  async createServiceAccount(ctx: ProvisioningContext): Promise<StepResult> {
    const { code, stdout } = await this.runBench([
      "--site",
      ctx.siteName,
      "execute",
      "amni_bridge.api.provision_service_account",
      "--kwargs",
      JSON.stringify({ email: ctx.serviceAccountEmail }),
    ]);
    if (code !== 0) {
      return { ok: false, detail: `service account creation failed: ${stdout}` };
    }

    const credentials = parseProvisioningCredentials(stdout);
    if (!credentials) {
      return { ok: false, detail: "service account creation returned no usable credentials" };
    }
    return {
      ok: true,
      detail: `service account ${ctx.serviceAccountEmail} created`,
      host: ctx.siteUrl,
      serviceCredentials: credentials,
    };
  }

  async createTenantAdmins(_ctx: ProvisioningContext): Promise<StepResult> {
    return { ok: true, detail: "tenant admins staged from wizard team step" };
  }

  async validate(ctx: ProvisioningContext): Promise<StepResult> {
    const config = loadConfig();
    const { code, stdout } = await this.runBench(["--site", ctx.siteName, "list-apps"]);
    if (code !== 0) {
      return { ok: false, detail: `validate ping failed: ${stdout}` };
    }
    const missing = config.installApps.filter((app) => !hasInstalledApp(stdout, app));
    if (missing.length) {
      return { ok: false, detail: `site ${ctx.siteName} is missing required apps: ${missing.join(", ")}` };
    }
    return { ok: true, detail: `site ${ctx.siteName} responds with all required apps` };
  }
}

function hasInstalledApp(output: string, app: string): boolean {
  return output.split(/\r?\n/).some((line) => line.trim().split(/\s+/)[0] === app);
}

function parseProvisioningCredentials(output: string): { apiKey: string; apiSecret: string } | undefined {
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).reverse();
  for (const line of lines) {
    const start = line.indexOf("{");
    const end = line.lastIndexOf("}");
    if (start < 0 || end <= start) continue;
    try {
      const value = JSON.parse(line.slice(start, end + 1)) as { api_key?: unknown; api_secret?: unknown };
      if (typeof value.api_key === "string" && value.api_key && typeof value.api_secret === "string" && value.api_secret) {
        return { apiKey: value.api_key, apiSecret: value.api_secret };
      }
    } catch {
      continue;
    }
  }
  return undefined;
}
