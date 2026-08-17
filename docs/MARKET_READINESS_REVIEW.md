# Market-readiness review — 2026-08-18

## Executive assessment

Amni's control plane, application shell, and ERP-backed modules can run coherently in local development, but the product is **not ready for production launch yet**. This review fixed the immediate login/dashboard failures, a dashboard authorization leak, sensitive-token logging, three ERP list mapping crashes, and flaky Windows verification. The remaining release blockers are concentrated in tenant provisioning, cross-module authorization, real ERP deployment, and production-scale data access.

## Fixed in M8-000

- Dashboard roles now come from the authenticated user's server-side membership. A client query parameter can no longer promote a member to admin.
- Dashboard response fields are filtered by role. Members receive only their permitted revenue KPI/trend; they no longer receive cash, receivables, alerts, activity, or admin quick actions.
- The dashboard now uses one shared snapshot request instead of three independently retried panel requests. Tenant scope is resolved once and ERP reads are reduced from roughly 13 to 8 for a complete load.
- ERP connection failures are shown as a truthful workspace status and actionable error instead of a generic panel failure while the hero claims data is live.
- Sales invoice, sales order, and quotation list mapping tolerates ERP list responses without child-line arrays instead of crashing the whole section.
- API logging redacts response `Set-Cookie` headers, preventing access and refresh tokens from being written to logs.
- Root typechecking now serializes each package's build before its typecheck, and the database package no longer runs a second competing Prisma generation step. This removes `.next/types` races and Windows Prisma DLL rename failures when no runtime process holds the client.
- A development-only ERP stand-in with representative records is available through `pnpm --filter @amni/api demo:erp`. It is never a production substitute.
- The landing page now has a product-led hero, responsive dashboard preview, capability narrative, guided operating flow, and stronger conversion path using the shared design system.

## Launch blockers

### P0 — provisioning does not produce usable tenant ERP credentials

`BenchDriver.createServiceAccount()` creates a Frappe user but does not generate and persist an API key/secret or assign the operational role bundle required for ERP DocType access. Newly provisioned tenants therefore cannot use the product without manual bench intervention. Fix this against a real v16 bench and add a two-tenant provisioning-to-dashboard integration test.

### P0 — authorization is not consistently enforced by product role

The dashboard boundary is fixed, and platform-admin routes have `AdminGuard`, but most domain controllers rely only on authentication and tenant membership. Before launch, define the permission matrix for owner/admin/member and specialist roles, enforce it server-side on every read and mutation, hide unavailable navigation/actions, and add negative authorization tests.

### P0 — no reproducible real ERPNext deployment is present

`DEVELOPMENT.md` says the frappe_docker wrapper lives under `infra/erp`, but this checkout contains only the custom app and an installation script; no compose files are present. This machine also has no Frappe/ERPNext images, containers, or volumes. Supply a reproducible pinned deployment or an explicit bootstrap script and verify backups, restore, upgrades, and tenant routing.

### P1 — list endpoints load complete ERP datasets

Many ERP-backed services still use `limitPageLength: 0` and then search, sort, and paginate in API memory. Response time and memory usage will grow with every customer, invoice, item, and ledger entry. Move supported filtering, ordering, field selection, and pagination into ERPNext queries; use bounded aggregation/report endpoints for dashboard totals.

### P1 — health reporting does not cover tenant data planes

`/healthz` reports the control plane (Postgres and Redis) as healthy even when every tenant ERP request fails. Keep the global control-plane check, but add tenant-aware ERP connection state, background health updates, and a visible degraded state for operators and workspace owners.

### P1 — real-bench and deployment gates are missing

The in-process Frappe stand-in is valuable for isolation tests but does not validate field permissions, DocType behavior, workflows, or Frappe version drift. Add a real-bench integration tier for provisioning and the critical sales/purchasing/finance paths, then make it a release gate. The Windows standalone Next.js build also warns that one client-reference manifest was not copied; verify the actual production image rather than accepting the warning.

### P1 — deployment and operations documentation is stale

Deployment documentation still describes an older demo posture and does not match the current ERP-backed architecture. Before launch, document secrets, migrations, queues, ERP cluster lifecycle, domain/TLS setup, monitoring, alerting, backups, restores, rollback, incident response, and data-retention responsibilities.

## Verification evidence

- `pnpm lint`: 8 workspaces passed.
- `pnpm typecheck`: 14 tasks passed after removing the build/typecheck races.
- `pnpm test`: 562 tests passed, including 458 API tests and the tenant-isolation suites.
- Production builds completed for API and web; the Next.js standalone trace warning remains recorded above.
- Local services verified on web `:3000`, API `:4000`, and development ERP stand-in `:8080`; Postgres and Redis were healthy in Docker.
- Admin and member login both returned 201. Dashboard snapshot returned 200 in 76 ms and 20 ms respectively during the first runtime pass.
- Ten representative module endpoints returned 200 in 12–168 ms with the development fixture.
- Browser checks passed at desktop and 390 px mobile widths. Admin received four KPIs and operational panels; member received only revenue data with restricted panels empty.

## Release recommendation

Do not market Amni as production-ready until all P0 items are closed on a real ERPNext bench. After that, close the P1 performance, health, integration, and operations gates, run a staged tenant pilot with production-like data volume, and perform an external security review.
