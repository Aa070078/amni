# Amni — Architecture

**Status:** Approved (Phase 1) · Update with any architecturally significant change (see AGENTS.md)

---

## 1. System overview

Amni is a multi-tenant ERP SaaS platform. Every customer company gets an **isolated ERPNext site** (own MariaDB database) provisioned automatically. Amni's own frontend and API are the product; ERPNext is the business-management engine underneath.

```
                     ┌────────────────────────────────────────────┐
                     │                 Amni Platform              │
                     │                                            │
   User ─────────►   │  apps/web (Next.js)                        │
                     │        │   (typed API client, never ERP)   │
                     │        ▼                                   │
                     │  apps/api (NestJS)  ──►  platform DB       │
                     │    auth · tenants · provisioning · erp-gw  │   Postgres (amni_platform)
                     │        │              │                    │
                     │        ▼              ▼                    │
                     │  apps/worker (BullMQ) ◄─── Redis ──► queues │
                     │    provisioning · imports · emails · notify │
                     └────────┬───────────────────────────────────┘
                              │ 1) bench CLI (docker exec) for provisioning/config
                              │ 2) HTTPS REST per-tenant service account
                              ▼
              ┌──────────────────────────────────────────────────────┐
              │            ERPNext cluster (frappe_docker)           │
              │  frontend (nginx, Host-header routing) ──► backend   │
              │  sites/ <tenant1>  <tenant2>  <tenant3> ...          │
              │  each site = own MariaDB DB + own API keys           │
              └──────────────────────────────────────────────────────┘
```

**Rule:** the frontend never depends on ERPNext for any operation. All data flows through the Amni API, which resolves the tenant server-side and talks to the tenant's ERPNext site via a per-tenant service account.

---

## 2. Technology stack (approved)

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo, TypeScript strict |
| Web | Next.js (App Router) · Tailwind CSS v4 · shadcn/ui · TanStack Query · TanStack Table · react-hook-form + zod · Framer Motion · Recharts (charts) |
| API | NestJS (modules, guards, decorators) |
| Worker | NestJS standalone + BullMQ (Redis) |
| Platform DB | PostgreSQL 16 · Prisma ORM + migrations |
| Jobs | Redis (BullMQ) — `provisioning`, `imports`, `mail`, `notify`, `default` |
| ERPNext client | Own typed client (`packages/erp`) over the official REST API |
| Provisioning | Worker shelling to bench CLI on the ERP cluster (docker exec); later a dedicated agent / Press |
| Secrets | Platform env vars (dev) → secret manager (prod); tenant ERP keys encrypted at rest |
| Observability | pino structured logs · request IDs · Sentry · Prometheus (optional) · DB audit log |
| Testing | Vitest/Jest (unit), supertest + Testcontainers (integration), Playwright (e2e), ERPChecks (tenant isolation) |
| CI/CD | GitHub Actions |
| Deploy (platform) | Docker Compose (Caddy/Traefik + TLS); later K8s |
| Deploy (ERP) | frappe_docker with wildcard-TLS overrides |

---

## 3. Repository structure

```
amni/
  apps/
    web/                 # Next.js product frontend
    api/                 # NestJS control-plane API
    worker/              # BullMQ job processors (standalone NestJS)
  packages/
    ui/                  # Design system (shadcn components, tokens, primitives)
    db/                  # Prisma schema, migrations, client
    erp/                 # ERPNext REST client + typed DTOs + provisioning helpers
    shared/              # Zod schemas, API contract types, constants, error codes
    config/              # shared tsconfig / eslint / prettier / tailwind presets
  infra/
    docker/              # platform compose (postgres, redis, api, worker, web)
    erp/                 # frappe_docker wrapper: overrides, envs, bench scripts
    bench/               # provisioning shell steps used by the worker
  docs/                  # design research, runbooks, ADRs
  tests/                 # e2e (Playwright), isolation tests, load scripts
  .github/               # workflows
```

---

## 4. Platform database (Postgres `amni_platform`)

Prisma schema in `packages/db`. Core entities:

```
User ──< Membership >── Company ──1:1── Tenant ──1:1── ERPInstance ──< ProvisioningJob
  │                       │              │                │
  │                       │          Subscription ── Plan
  │                       │                │
  │                    Invitation ──── AuditLog
  │                    DataImportJob
  │                    Notification
  └── Session / EmailVerification / PasswordReset / ApiKey
```

Key rules:
- **Platform DB answers "who owns this ERP and how do we manage it."** It never stores tenant business data (customers, items, invoices, stock).
- `Tenant` holds identity/config: `siteName`, `siteUrl`, `dbName`, `status`, `planTier`, `erpnextVersion`, `locale` (currency/timezone/date/number), `region`.
- `ERPInstance` captures deployment facts: host, cluster, capacity group, health, lastHealthCheck.
- `ProvisioningJob`: `type`, `state` (state machine §7), `attempts`, `maxAttempts`, `steps` (jsonb), `logs` (jsonb append-only), `lastError`, `runAt`/`startedAt`/`finishedAt`, `createdBy`, `idempotencyKey`.
- `AuditLog`: actor, action, resource type/id, metadata (jsonb), ip, requestId, at — used for tenant lifecycle and sensitive ops.
- `Membership`: userId + companyId + platformRole. **Tenant resolution is always server-side from Membership; never from client input.**
- Secrets: `ERPInstance.serviceKeyCipher` (encrypted service-account api_key:api_secret) — decrypted only inside the ERP client.

---

## 5. Multi-tenancy model

- **Isolation layer 1 — ERPNext:** one site per tenant; each site is its own MariaDB database with its own `db_user`. Frappe's DNS multitenancy + frappe_docker nginx (`server_name $host`) route requests by Host header. Verified live.
- **Isolation layer 2 — Amni API:** a user is bound to companies via `Membership`. The API resolves the active tenant from the authenticated session + membership, and every ERP call goes through that tenant's service account to that tenant's site URL. A malicious client cannot address another tenant: the site URL, service keys, and roles are server-side only.
- **Shared infrastructure (MVP):** one bench, shared MariaDB/Redis/workers/scheduler. Scaling path: split benches (Press release groups), then per-tenant dedicated stacks for the premium tier, then K8s for HA/multi-region.

### Tenant lifecycle
`Signup → Company created → Tenant QUEUED → ProvisioningJob → READY → ACTIVE → (SUSPENDED → RESUME) → (ARCHIVED/DELETE)`

### Site naming
`<company-slug>.<platform-domain>`. Slug from company name, de-duplicated, lowercased, DNS-safe. Dev: `http://<slug>.localhost:8080`. Site name must equal hostname (Frappe DNS model).

---

## 6. Provisioning architecture

### 6.1 State machine

```
             ┌──────────────────────── retry (backoff, attempts++) ────────────────┐
             ▼                                                                       │
 CREATED → QUEUED → PROVISIONING → CONFIGURING → VALIDATING → READY → ACTIVE
                       │               │            │
                       ▼               ▼            ▼
            PROVISIONING_FAILED  CONFIGURATION_FAILED  VALIDATION_FAILED  ──┐
                                                                             │ (safe retry)
```

Failure states are terminal-but-retryable: a failed job can be requeued; every step is **idempotent** (checks actual ERP state before acting), so a retry resumes rather than duplicates.

### 6.2 Provisioning steps (worker, queue `provisioning`)

1. **Guard**: tenant status must allow provisioning; `idempotencyKey` checked; no duplicate job running.
2. **Preflight**: host subdomain available (site not already existing), config valid (currency/timezone/country), secrets prepared.
3. **Create site**: `bench new-site <site> --mariadb-user-host-login-scope=% --db-root-password <admin> --admin-password <temporary> --install-app erpnext` (docker exec on bench backend). Poll until ready.
4. **Configure**: set scheduler on; set System Settings (timezone, date format, number format, country, language); create the **Company** (name, abbreviation, country, currency, CoA, fiscal year) and let ERPNext auto-create defaults (accounts, warehouses, cost centers, departments, tax template); set Global Defaults.
5. **Service account**: create `amni-integration@<site>` user with scoped roles; generate `api_key`/`api_secret`; store encrypted in platform.
6. **Tenant admin users**: create users from wizard team step (email, name, role bundle, initial password or password-reset invite); role bundles map product roles → ERPNext roles.
7. **Validate**: ping; probe read (as service account); probe tenant-admin login/roles; confirm company exists; report health.
8. **Finish**: mark `ERPInstance.READY`, tenant `ACTIVE`, notify owner (email + in-app), emit event.

### 6.3 Reliability
- BullMQ attempts + exponential backoff; `attempts` persisted on the job.
- Idempotency keys + existence checks per step; partial-failure recovery (a failed step re-runs from the failing point).
- Full `steps` + `logs` trail in Postgres (observable in UI + audit).
- Timeouts and heartbeat per step; a stuck job is failed and surfaced.

---

## 7. Amni API (NestJS) — module map

| Module | Responsibility |
|---|---|
| `AuthModule` | register, login, refresh, logout, verify-email, reset-password, MFA (future), session management, throttling |
| `UsersModule` | profile, password, sessions, preferences |
| `CompaniesModule` | company profile, onboarding state |
| `TenantsModule` | tenant lifecycle, provisioning status/retry, health, settings |
| `ProvisioningModule` | job lifecycle, state machine, progress streaming, re-queue |
| `PlansModule` / `BillingModule` | plans, subscriptions (stub provider), limits |
| `MembersModule` | memberships, invitations, role bundles |
| `ErpGatewayModule` | **the only module that calls ERPNext** — exposes domain endpoints (customers, items, sales, purchasing, inventory, finance, reports, search, import) mapped to the tenant service account |
| `ImportModule` | 6-stage import orchestration (template → upload → map → validate → import → status) |
| `NotificationsModule` | in-app + email notifications |
| `AuditModule` | write + query audit log |
| `WebhooksModule` | receive ERPNext webhooks (events from tenant sites) |
| `HealthModule` | platform + per-tenant health endpoints |

**API contract** is defined centrally in `packages/shared` (Zod schemas + types): auth, envelope `{ data | error, requestId }`, pagination (`cursor`/`offset`), filtering/sorting/search conventions, error codes, versioned routes (`/api/v1/...`). Pages never invent ad-hoc API behavior.

### AuthN/AuthZ
- Platform: email+password (argon2id), httpOnly session cookies + refresh rotation, SameSite/CSRF double-submit, email verification, rate-limited password reset, account lockout after N failures, per-user+per-IP throttling.
- Authorization: NestJS guards + role decorators; tenant scope derived from membership; **all checks server-side**.
- ERPNext: per-tenant service account (`Authorization: token <api_key>:<api_secret>`); CSRF-exempt by design.

---

## 8. ERPNext integration layer (`packages/erp`)

- Typed client over the official REST API (`/api/v1` rules): `client.list/create/get/update/submit/cancel`, `call(method)`, with retry + timeout + request-id headers.
- Tenant resolution: callers pass `tenantId`; the client loads `ERPInstance`, decrypts keys, targets the tenant site URL.
- **Never any direct tenant-to-tenant path.** No client-supplied tenant id reaches ERPNext unvalidated.
- Extension mechanisms used (no core modifications): Configuration (System Settings, Global Defaults), DocTypes via REST, Custom Field/Property Setter/Workflow (later), Roles, Webhooks. If a core modification ever seems necessary, it must be researched, documented in an ADR, and justified against these supported mechanisms first.

---

## 9. HRMS (Frappe HR embed)

- Frappe HR (`hrms` app, branch `version-16` to match the pinned `ERPNEXT_VERSION=v16.30.0`) is installed on every tenant site via provisioning (`ERPNEXT_INSTALL_APPS`, default `erpnext,hrms`); `Tenant.hrmsInstalled` records availability. Existing sites use `infra/erp/scripts/install-hrms.ps1`.
- The platform embeds the tenant's **Frappe HR desk** in an iframe under `/hrms` — no native rebuild. People (Contacts) lives inside HRMS; the desk provides employees, leave, attendance, shifts, appraisals, recruitment, payroll.
- **SSO**: `apps/api/src/hrms` mints a short-lived HS256 JWT (iss `amni-hrms`, aud = tenant site URL, signed with `HRMS_SSO_SECRET`) and redirects the browser to `/api/method/amni_bridge.api.login` on the tenant site. The tiny non-core `amni_bridge` app (in `infra/erp/apps/amni_bridge`) validates the token, logs the user into the desk (auto-creating a Desk User if the platform user has none), and redirects to `/app/hrms`.
- **Same-site cookies**: tenants are subdomains of the platform domain, so the desk `sid` cookie is same-site inside the iframe — no third-party-cookie workaround needed.
- Theming: `amni_bridge` ships `amni-theme.css` (Amni violet) injected via `app_include_css`/`web_include_css`.
- **Rule:** the iframe is the only place the browser talks to ERP; everything else still flows through `apps/api`.

---

## 10. Background jobs (Redis/BullMQ)

| Queue | Consumers | Examples |
|---|---|---|
| `provisioning` | provisioning processor | new-site, configure company, service account, validate |
| `imports` | import processor | data-import batches (from 6-stage flow) |
| `mail` | mail processor | verification, reset, welcome, import summaries |
| `notify` | notify processor | in-app notifications, webhook dispatch |
| `default` | misc | scheduled cleanup, health checks, key rotation, backups |

**Rule:** no normal request waits on a long infrastructure operation. Long work is enqueued; progress is observable.

---

## 11. Observability

- **Structured logs** (pino, JSON) on API + worker; correlated by `requestId` (API) / `jobId` (worker).
- **Traceability across the critical path:** `User → Frontend → API (requestId) → Worker (jobId) → ERPNext (X-Frappe-Request-Id) → Result` — the platform logs the ERPNext request id for each outbound call.
- **Provisioning logs** stored in Postgres (job trail) and streamed to the UI.
- **Tenant health** checks (scheduler tick on `HealthModule`): ping + service-account probe per tenant.
- **Error tracking** (Sentry) with `requestId`/`tenantId` context (no PII).
- **Audit log** for sensitive actions (provisioning, role changes, billing, key access).
- Metrics (optional): Prometheus + Grafana; queue depth, job durations, ERP latency.

---

## 12. Security summary

Full details in `SECURITY.md`. Highlights:
- Tenant isolation at two layers (site DB + API-scoped service accounts).
- Server-side authorization everywhere; never trust the client.
- Secret handling: env vars / secret manager; ERP keys encrypted at rest; no secrets in repo.
- API abuse: throttling, rate limits, account lockout, per-tenant quotas.
- Web: CSRF double-submit, CSP, secure cookies, XSS defenses (React escaping + input validation), upload validation (type/size), SSRF protection (ERP base URLs allow-listed to the tenant cluster).
- Injection: parameterized Prisma queries; ERP calls via JSON API only (no raw SQL); user-controlled filters validated by Zod.

---

## 13. Backups, deployment, scaling, DR

- **Platform DB:** scheduled pg_dump + point-in-time (WAL) on prod; restores tested.
- **ERP cluster:** `bench --site <site> backup --with-files` per tenant on a schedule (frappe_docker backup cron or platform job); backups stored off-cluster; restore runbook in `DEPLOYMENT.md`.
- **Deployment:** `infra/docker` compose for the platform (Caddy/Traefik + TLS); `infra/erp` for frappe_docker with wildcard TLS (nginx-proxy/acme-companion). Zero-downtime releases by rolling workers/API; DB migrations before code.
- **Scaling:** platform stateless (horizontal API/web); worker horizontal with BullMQ; ERP by adding benches (sites distributed across benches), then Press, then K8s.
- **Disaster recovery:** RPO/RTO documented in `DEPLOYMENT.md`; restore drills; off-site backups.

---

## 14. Future architecture evolution

1. **Provisioning agent / Press** — replace docker-exec bench calls with the Press control plane (benches, release groups, site moves, resource caps, custom domains, auto-TLS).
2. **Per-tenant benches / dedicated DBs** — premium tier: tenant gets own bench + MariaDB (or dedicated servers) via the same provisioning API.
3. **Custom domains + SSO** — per-tenant custom domains (cookie/CSRF scope validation), OAuth/SAML into the desk.
4. **Multi-region / K8s** — only at significant scale; keep ERP cluster and platform on separate failure domains.
5. **Payments/accounting depth** — ledgers, multi-currency, intercompany, tax automation exposed through the Amni UI.
6. **AI features** — natural-language reporting, anomaly detection, smart defaults engine over the ERP data plane (read-only agent with scoped credentials).

---

## 15. Architecture review checklist (run at each major phase)

- Did we violate the architecture? (coupling frontend→ERP, tenant resolution from client, mixing stores)
- Did we modify ERPNext core? (must be ADR-justified)
- Is tenant isolation intact at both layers?
- Are new endpoints typed and following the shared contract?
- Is any long operation running synchronously in a request?
- Are secrets handled correctly?
- Are new modules documented and tested?
