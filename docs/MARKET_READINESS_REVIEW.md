# Market-readiness review — 2026-08-18

## Executive assessment

Amni's control plane, application shell, onboarding flow, and ERP-backed modules now run coherently against both the development fixture and a real pinned ERPNext v16 bench, but the product is **not ready for production launch yet**. M9 closes the three P0 blockers identified in the first review: provisioning now creates usable encrypted ERP credentials and roles, the owner/admin/member authorization baseline is enforced server-side, and the repository can build and bootstrap a real reproducible ERP stack. Remaining release blockers are concentrated in demo-only domain stores, production-scale data access, operations, and automated release gates.

## Fixed in M9 product-readiness work

- Registration and onboarding drafts are persisted per user and can no longer attach a new signup to the shared demo company. Company/profile settings now persist to the authenticated user's company and profile.
- The worker reliably loads its local database/Redis environment. Failed provisioning is visible and retryable, unfinished workspaces are redirected to setup, and the failed-job retry path is idempotent.
- The bench driver installs ERPNext, HRMS, and Amni Bridge; runs ERPNext's supported programmatic setup flow; creates a dedicated integration user; assigns eight operational roles; rotates API credentials; encrypts them at rest; and probes the authenticated user plus Company access before activation.
- Unsafe API methods now default to owner/admin authorization. Explicit member self-service exceptions are limited to onboarding, profile/password, and notification state; negative tests and a live 403 probe cover the boundary.
- CRM is a first-class `/crm` workspace instead of a Sales child. Legacy URLs redirect, Sales is a compact quote-to-cash launchpad, and the dashboard hierarchy/responsive grid no longer leaves an empty KPI column or collides with its decorative hero.
- The real browser journey now exercises signup, all six setup steps, customer and product creation, order and invoice creation, invoice submission, allocated payment, and the paid dashboard state. It also fixed duplicate product POSTs, encoded document identifiers on every detail route, setup-label accessibility, and invoice payments that were not allocated to their ERPNext invoice.
- `infra/erp/scripts/build-image.ps1` and `bootstrap.ps1` build a pinned image and reproducibly start MariaDB, Redis, Frappe, ERPNext, HRMS, and Amni Bridge. The bootstrap was exercised from image build through real HTTP ping, app installation, company configuration, token authentication, role verification, and REST Company access.

## Fixed in M8-000

- Dashboard roles now come from the authenticated user's server-side membership. A client query parameter can no longer promote a member to admin.
- Dashboard response fields are filtered by role. Members receive only their permitted revenue KPI/trend; they no longer receive cash, receivables, alerts, activity, or admin quick actions.
- The dashboard now uses one shared snapshot request instead of three independently retried panel requests. Tenant scope is resolved once and ERP reads are reduced from roughly 13 to 8 for a complete load.
- ERP connection failures are shown as a truthful workspace status and actionable error instead of a generic panel failure while the hero claims data is live.
- Sales invoice, sales order, and quotation list mapping tolerates ERP list responses without child-line arrays instead of crashing the whole section.
- API logging redacts response `Set-Cookie` headers, preventing access and refresh tokens from being written to logs.
- The dependency tree pins patched `deepmerge-ts` 8.x after CI detected the high-severity recursive-merge exhaustion advisory in Prisma's transitive configuration dependency.
- Root typechecking now serializes each package's build before its typecheck, and the database package no longer runs a second competing Prisma generation step. This removes `.next/types` races and Windows Prisma DLL rename failures when no runtime process holds the client.
- A development-only ERP stand-in with representative records is available through `pnpm --filter @amni/api demo:erp`. It is never a production substitute.
- The landing page now has a product-led hero, responsive dashboard preview, capability narrative, guided operating flow, and stronger conversion path using the shared design system.

## M10 progress

- CRM organizations, contacts, tasks, notes, activities, events, call logs, email templates, WhatsApp history, notifications, saved views, and CRM settings now persist in each tenant's ERP site through the supported Amni Bridge custom DocType. API contracts are unchanged; every request derives the site from authenticated membership.
- The CRM repository has two-tenant HTTP isolation coverage. The pinned real bench created and queried a CRM record through authenticated Frappe REST, then returned the identical JSON payload after the backend container restarted.
- Existing sites now run `bench migrate` during ERP image bootstrap, ensuring bundled DocTypes and patches match the immutable image. The development ERP fixture includes representative CRM records without seeding customer production sites.

## Launch blockers

### P0 — several product domains still use process-local demo stores

CRM is now durable and tenant-local. Accounting, invoicing, equity, ESG, and signing still keep representative data in process memory rather than tenant ERPNext. That data resets on restart and is not a safe multi-tenant system of record. Replace each remaining store, add cross-tenant tests, and remove demo-only product claims before a paid launch.

### P1 — specialist business roles are not implemented

The server now consistently enforces the available platform roles: owners and admins may mutate company data, while members have read access plus narrowly declared self-service mutations. Accountant, sales, and inventory roles shown during onboarding are not yet represented in platform membership or enforced as domain-specific permissions. Define that matrix, persist the roles, filter navigation/actions, and add negative tests before inviting broader customer teams.

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
- `pnpm test`: 565 tests passed (API 461, worker 26, ERP 66, shared 5, web 7).
- `pnpm test:isolation`: 84 tenant-isolation tests passed.
- Playwright: both critical journeys passed in Chromium: signup → six-step setup → provisioning and customer → product → order → invoice → submit → allocated payment → paid dashboard.
- `pnpm audit --audit-level high`: passed after the patched dependency override; one low-severity advisory remains below the enforced threshold.
- Production builds completed for API and web; the Next.js standalone trace warning remains recorded above.
- The pinned real ERP stack was built and bootstrapped in Docker at `:8080`. A clean `readiness.localhost` site installed ERPNext, HRMS, and Amni Bridge; its dedicated token authenticated as `amni-integration@readiness.local`, carried eight operational roles, and read its configured Company through REST.
- A fresh platform signup was driven through setup and provisioning. The worker consumed the job, the tenant reached `ACTIVE`, the company reached `READY`, and an encrypted healthy ERP instance was persisted. Postgres and Redis were healthy in Docker.
- Admin and member login both returned 201. Dashboard snapshot returned 200 in 76 ms and 20 ms respectively during the first runtime pass.
- Ten representative module endpoints returned 200 in 12–168 ms with the development fixture.
- Browser checks passed in light/dark themes at desktop and 390 px mobile widths across the landing page, dashboard, Sales, standalone CRM, and company settings. Admin received four KPIs and operational panels; member received only permitted data and unsafe member mutation returned 403.

## Release recommendation

Do not market Amni as production-ready while process-local demo stores remain in customer-facing domains. After replacing those stores, close the P1 role, performance, health, automated real-bench, deployment, and operations gates; run a staged tenant pilot with production-like volume; and perform an external security review.
