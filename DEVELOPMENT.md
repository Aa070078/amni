# Development Guide — Amni

A new developer should be able to clone this repo and get a running environment without private knowledge.

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 20 | LTS recommended |
| pnpm | ≥ 9 | corepack: `corepack enable pnpm` |
| Docker + Compose v2 | recent | Docker Desktop on Windows |
| Git | any | — |
| PostgreSQL | 16 (Docker) | provided via `infra/docker` |
| Redis | 7+ (Docker) | provided via `infra/docker` |

## 2. Clone & install

```bash
git clone git@github.com:Aa070078/amni.git && cd amni
git checkout dev
pnpm install
```

## 3. Environment variables

Copy example envs (never commit real ones):

```bash
cp infra/docker/.env.example .env
cp apps/api/.env.example apps/api/.env
# Optional: copy this only when the worker needs values that differ from the API.
cp apps/worker/.env.example apps/worker/.env
cp infra/erp/.env.example infra/erp/.env
```

In local development the worker falls back to `apps/api/.env` for the shared database and Redis settings, so `pnpm dev` cannot start a queue consumer with a missing `DATABASE_URL`.

Key variables (full list in the example files):

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string for the platform DB |
| `REDIS_URL` | Redis for BullMQ + cache |
| `ACCESS_TOKEN_SECRET` | JWT access-token signing secret (min 32 chars) |
| `ACCESS_TOKEN_TTL_SECONDS` | access-token lifetime in seconds (default 900) |
| `REFRESH_TOKEN_TTL_DAYS` | refresh-token/session lifetime in days (default 30) |
| `SMTP_*` / `MAIL_PROVIDER` | email delivery (dev: console/smtp4dev) |
| `ERPNEXT_CLUSTER_*` | how the worker reaches the bench (`DOCKER_EXEC` in dev; exec target + site root) |
| `ERPNEXT_INSTALL_APPS` | apps installed on every new site (default `erpnext,hrms,amni_bridge`) |
| `HRMS_SSO_SECRET` | HMAC secret that signs the HRMS SSO token (must match bench `amni_sso_secret`) |
| `PLATFORM_URL` / `PLATFORM_DOMAIN` | app + tenant subdomain base |
| `ENCRYPTION_KEY` | AES-GCM key used to encrypt tenant ERP service keys at rest |
| `SENTRY_DSN` | optional error tracking |

## 4. Run the platform (Postgres + Redis)

```bash
docker compose -f infra/docker/compose.yaml up -d
pnpm db:migrate       # apply Prisma migrations
pnpm db:seed          # seed plans + admin (dev)
```

## 5. Run the ERP cluster (ERPNext via frappe_docker)

The ERP cluster is reproducibly built from the official `frappe/frappe_docker` repository pinned to commit `616ffd417797031f760e7a6c9669923a5febed66`. The bootstrap builds an immutable image containing ERPNext, HRMS, and `amni_bridge`, starts the required MariaDB/Redis/no-proxy overrides, creates the integration site, and verifies the real Frappe ping endpoint:

```powershell
Copy-Item infra/erp/.env.example infra/erp/.env
# Replace AMNI_SSO_SECRET and mirror it as HRMS_SSO_SECRET in apps/api/.env.
powershell -File infra/erp/scripts/bootstrap.ps1
```

- Re-run with `-SkipBuild` when the immutable image already exists.
- Verify manually at `http://localhost:8080/api/method/ping`; local-only login is `Administrator` / `admin`.
- The worker reaches `frappe-backend-1` and provisions tenant sites with `erpnext,hrms,amni_bridge` by default.

### 5.0.1 Development stand-in when a bench is unavailable

The API package includes a small authenticated, in-memory Frappe stand-in for local UI work and automated smoke checks:

```bash
pnpm --filter @amni/api demo:erp
```

It listens on `127.0.0.1:8080` by default and uses the same development credentials as `seed-demo-company.ts`. It contains representative dashboard, sales, CRM, customer, warehouse, item, and stock records. This process is **development-only**: it does not implement Frappe permissions, workflows, validation, provisioning, or persistence and must never be used as production evidence or deployed with Amni.

### 5.1 HRMS (Frappe HR + Amni SSO)

Frappe HR (the `hrms` app) ships as the embedded HRMS section in the platform. Every new site gets it automatically via `ERPNEXT_INSTALL_APPS` (default `erpnext,hrms,amni_bridge`). Existing sites need the one-off script below.

- **The SSO bridge**: the platform API mints a short-lived JWT (`HRMS_SSO_SECRET`), and the tiny `amni_bridge` app (in `infra/erp/apps/amni_bridge`, a non-core app) validates it on the tenant site and logs the platform user into the Frappe HR desk. It also themes the desk with Amni colors.
- **Existing site setup** (new sites get `hrms` + `amni_bridge` from provisioning, no action needed):
  ```powershell
  # infra/erp/scripts/install-hrms.ps1
  powershell -File infra/erp/scripts/install-hrms.ps1 -Sites localhost,myco.localhost
  ```
  The script installs apps already baked into the immutable image and writes `amni_sso_secret` into the bench `common_site_config.json`; it never modifies running container application code.
- **Secrets must match**: set the same value for `AMNI_SSO_SECRET` in `infra/erp/.env` (used to write the bench config) and `HRMS_SSO_SECRET` in `apps/api/.env`. The script fails loudly if they differ.

## 6. Run apps

```bash
pnpm dev
```

Starts (Turborepo): `apps/web` (Next.js, default :3000), `apps/api` (NestJS, :4000), `apps/worker` (BullMQ consumers). Dev proxy: web → api `/api` → :4000.

## 7. Useful scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | run web + api + worker (watch) |
| `pnpm build` | typecheck + build all |
| `pnpm lint` | eslint all packages |
| `pnpm typecheck` | tsc across packages |
| `pnpm test` | unit + integration tests |
| `pnpm test:e2e` | Playwright e2e |
| `pnpm db:migrate` / `pnpm db:seed` | Prisma migrate / seed |
| `pnpm studio` | Prisma Studio (inspect platform DB) |
| `pnpm storybook` | design-system review |

## 8. Debugging

- **API logs**: `pnpm --filter api dev` shows pino JSON logs with `requestId`.
- **Jobs**: inspect BullMQ queues via `apps/api` dev admin route or Redis (`redis-cli keys 'bull:*'`).
- **ERP calls**: platform logs include the ERPNext request id; inspect bench logs with `docker compose -p frappe logs backend`.
- **Provisioning**: watch `ProvisioningJob` rows (Prisma Studio) or the onboarding UI progress; job `logs` field is the trail.
- **Container source reading (v16)**: `docker cp frappe-backend-1:/home/frappe/frappe-bench/apps/frappe/frappe/<path> <tmp>` then read locally — never `python -c` through PowerShell quoting.

## 9. Common problems

| Problem | Fix |
|---|---|
| Compose pull fails `context deadline exceeded` | `PULL_POLICY=missing` (already set in dev `.env`) |
| Frontend unreachable after stack up | the compose command is missing `compose.noproxy.yaml` |
| `new-site` fails on Redis | Redis override missing; also drop the partial site first (`bench drop-site <s> --no-backup --root-password admin`) |
| Site `localhost` conflicts in API tests | use distinct site names per test tenant (`<x>.localhost`) |
| Port 3000/4000 busy | override via env (`PORT`, `API_PORT`) |
| Windows PowerShell + docker quoting | write scripts to `C:\Temp\opencode` and `docker cp`; avoid `bash -c '...'` inline quoting |
| `Module not found: frappe` in container | use the venv python: `/home/frappe/frappe-bench/env/bin/python` |
| DB user connection denied during provisioning | always pass `--mariadb-user-host-login-scope=%` |

## 10. Troubleshooting flows

- **Provisioning stuck in PROVISIONING**: inspect job `logs`; check bench logs; verify site actually created (`docker compose -p frappe exec backend bash -c "ls sites"`); if partially created, retry the job (idempotent) or clean the partial site manually.
- **Isolation suspect**: run the tenant-isolation test suite (`pnpm test:isolation`); verify a second tenant's call to the first tenant's site URL 403/404s.
- **Migrations drift**: `pnpm db:migrate` in CI/CD must run before deploy; never hand-edit the DB.
