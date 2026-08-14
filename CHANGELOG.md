# Changelog

All notable changes to Amni are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/) and the repo uses [Conventional Commits](https://www.conventionalcommits.org/). Unreleased work lands on `dev` and is promoted here on merge.

## [Unreleased]

### Added (dev)
- **M5 split registered (ERP data wiring, market-readiness)** — M5 is now the market-readiness epic: replace in-memory seed data in every reference module with live reads/writes to each tenant's real ERPNext site (the original "ERP gateway lands (M5)" plan). Two parallel agent tracks own disjoint files: Track A = `packages/erp/src/{sales,inventory}.ts` + sales/inventory API modules (M5-001..003); Track B = `packages/erp/src/{purchasing,finance}.ts` + purchasing/finance API modules + real-bench integration tier + CI gates (M5-004..007). Contract shapes unchanged (frontend untouched); isolation tests per module; COMMS M5-COMMS-001 posted.
- **Import web UX + notifications persistence + ERPNext import writes (M4-001/M4-005/M4-006)** — completes the M4 import pipeline (backend M4-002..M4-004 landed in PR #52):
  - M4-001 — in-app notifications persistence: `apps/api` notifications controller/service read from DB; `apps/worker/src/jobs/notify.processor.ts` persists `NOTIFY` jobs (replacing the in-memory seed), with `notifications.service.spec.ts` + `notify.processor.spec.ts`.
  - M4-005 — ERPNext import integration: `packages/erp/src/imports.ts` kind→doctype methods (feeds M4-004), two-tenant isolation suite `apps/api/src/imports/imports.isolation.spec.ts`; row-level ERP failure handling in `imports.processor.ts`.
  - M4-006 — import web UX: 6-stage wizard at `/imports` for customers/items/suppliers/contacts/leads — template download (`GET /api/v1/imports/templates/:kind`), drag-and-drop CSV/XLSX upload with client-side type/size validation + server parsing preview, fuzzy auto-mapping (`import-mapping.ts`, 7 unit tests) with manual override + mode/key-field selection, row/cell-level validation with "show only errors", live import polling until the worker completes, and a summary with created/updated/skipped/failed/warnings counts, failed-rows download and rollback (undo).
  - `apps/web/src/lib/imports.ts` typed client; `apps/web/src/components/imports/` wizard + jobs list; `/imports` route added to the sidebar ("Import data") and the setup wizard's import step links there.
  - Fixed strict-mode TS error in `apps/worker/src/jobs/imports.processor.ts` (`rowErrors[0]` possibly undefined).
- **Onboarding email pipeline (M3-007, PR #49)** — verify/reset/welcome emails end-to-end:
  - `packages/shared`: `schemas/mail.ts` — `MailTemplate` constants + zod `mailJobSchema` discriminated union (`verification`/`reset`/`welcome`) + `MailJob` type.
  - `apps/api`: `JobsModule` (BullMQ `mail` queue) + `MailService.enqueue()`; `AuthService` enqueues welcome + verification on production registration, and reset on `request-password-reset` (replacing the `TODO(M5)` stubs).
  - `apps/worker`: `MailProcessor` validates jobs against the shared schema, renders escaped HTML/plain templates, and sends via `MailerService` — `console` provider in dev (logs the rendered message) or SMTP when `MAIL_PROVIDER=smtp` + `SMTP_HOST` set (nodemailer); `MAIL_FROM` + `PLATFORM_URL` configurable. Mail config documented in `apps/worker/.env.example` + `infra/docker/.env.example`.
  - Fixed a latent worker boot crash (`app.get(Logger)` on a non-provider) so `apps/worker` actually starts; verified live end-to-end.
- **ERP gateway milestone (M3-001/M3-002/M3-005, PR #41)** — first real path from the API to per-tenant ERPNext sites, with tenant isolation guarantees:
  - `packages/erp` client v1: session auth (`login`/`getLoggedUser`/`logout` via Frappe `sid`), AES-256-GCM at-rest encryption for tenant service-account keys (`ENCRYPTION_KEY`), and `resolveTenantErp`/`createErpClientForTenant` resolving the tenant's `ERPInstance` from the authenticated session (never client input) with an `allowHost` SSRF pin. 35 unit tests.
  - `apps/api` `ErpGatewayModule` at `/api/v1/erp/*`: tenant-scoped `resource` CRUD (+ `?action=submit|cancel`) and whitelisted `method` proxy; no-membership → 403; every mutation written to `AuditLog` (actor, company, resource, ip, requestId). Tenant-state `ErpError`s now map to 409 instead of 500 in the exception filter.
  - `packages/shared` `erp-gateway` zod schemas for the proxy contract.
  - Tenant isolation suite: `pnpm --filter @amni/api test:isolation` (`vitest.isolation.config.ts`) runs `*.isolation.spec.ts` against in-process mock Frappe REST sites (two tenants, per-site token enforcement) — cross-tenant access returns 403/404, no data leaks, forged cross-tenant credentials rejected. Passes in CI without a live bench.
- **CRM: Deals entity (CRM-000) (#50)** — qualified-opportunities pipeline mirroring the Leads pattern:
  - `packages/shared`: `deals.ts` zod schemas (`DL-\d{4}` codes, stages qualification/analysis/proposal/negotiation/won/lost with probabilities 15/30/55/80/100/0, sources, activity/detail/pipeline/stat schemas, list response schema).
  - `apps/api`: `deals` module — seeded pipeline of 10 deals, `GET/POST /sales/deals`, `GET/PATCH/DELETE /sales/deals/:code`, `PATCH /sales/deals/:code/stage`, whitelisted sorting, derived activity feed; AuthGuard-protected; registered in `AppModule`.
  - `apps/web`: `lib/deals.ts` typed client; `components/deals/` — kanban board (column-wise stage columns), table view, list view with stat cards + debounced search, detail page (stage select, notes, activity timeline), new-deal dialog; routes `/sales/deals` + `/sales/deals/[code]`; Sales hub Deals card.
- **Data imports backend (M4-002/M4-003/M4-004, PR #52)** — first half of the M4 import pipeline (web UX + ERPNext writes follow):
  - `packages/shared`: extended `schemas/import.ts` (cell value, file metadata, validation, job, template, validation-result schemas + types) and added `import-engine.ts` (templates for customers/items/suppliers/contacts/leads, template CSV builder, `applyImportMapping`, `validateImportRows` with required-field and number checks + per-row issues).
  - `apps/api`: new `imports` module — `GET /api/v1/imports/templates`, `GET /templates/:kind` (CSV download), `GET/POST /imports`, `POST /:id/upload` (multipart, 10MB csv/xlsx), `PUT /:id/mapping`, `GET /:id/validation`, `POST /:id/execute`, `GET /:id/summary`, `POST /:id/rollback` — tenant-scoped via membership, zod-validated, audited, AuthGuard-protected; `jobs` module registers the `IMPORTS` BullMQ queue.
  - `apps/worker`: `imports.processor.ts` consumes `IMPORTS` jobs `{ importId, tenantId }`, re-validates rows, persists `validation` + `summary`, marks the job `COMPLETED`, and enqueues a `NOTIFY` success notification to the initiator (seam for M4-001).
  - Fixed worker standalone bootstrap (`main.ts` no longer calls `app.useLogger(app.get(Logger))`).
  - Tests: shared engine (5), API imports service + file parsing (part of 325 API tests), worker processor (4); live end-to-end smoke test green (create → upload → mapping → validate → execute → worker COMPLETED → summary).

- **Provisioning pipeline (M3-000/M3-003/M3-006/M3-004, PR #51)** — wizard submit now drives an async, idempotent provisioning pipeline:
  - `packages/shared`: plan catalog schema/types (`catalogPlanSchema`, `PlansListResponse`) + provisioning status/step types reused from `tenant.ts`.
  - `apps/worker`: 7-step provisioning state machine (`provisioning/state-machine.ts`) with per-step persistence, resume-from-failed-step, terminal failure states, per-step tenant status transitions; `SimulationDriver` + `BenchDriver`; `provisioning.processor.ts` delegates to the state machine; `state-machine.spec.ts` (4 tests).
  - `apps/api`: `plans` module (GET catalog, `findByCode`), `provisioning` module (`GET /provisioning/status`), `WizardService.submit` upserts the tenant, creates the subscription, writes an AuditLog and enqueues a BullMQ `provision` job with an idempotency key (`BullModule` registered in `AppModule`); wizard spec extended (5 tests).
  - `apps/web`: setup wizard renders a live provisioning progress card polling `/provisioning/status` every 3s, routing to `/dashboard` once the tenant is `ACTIVE`.

- **HRMS embed (M5-000, PR #53)** — the full Frappe HR desk embedded in the platform as the HRMS module:
  - `apps/worker`: `ERPNEXT_INSTALL_APPS` (default `erpnext,hrms`) installs Frappe HR on every new site; `Tenant.hrmsInstalled` set after `create_site`.
  - `packages/db`: `Tenant.hrmsInstalled` column (migration `20260811090000_hrms_installed`).
  - `infra/erp`: non-core `amni_bridge` app (SSO login endpoint + Amni desk theming) + `scripts/install-hrms.ps1` for existing sites.
  - `apps/api`: `hrms` module — `GET /hrms/status`, `GET /hrms/sso-url` minting short-lived HS256 tokens (`HRMS_SSO_SECRET`); `hrms.service.spec.ts` (6 tests).
  - `apps/web`: HRMS module in nav (People moved under it), `/hrms` page with the embedded desk iframe + People hub.

- **Provisioning pipeline (M3-000/M3-003/M3-006/M3-004, PR #51)** — wizard submit now drives an async, idempotent provisioning pipeline:
  - `packages/shared`: plan catalog schema/types (`catalogPlanSchema`, `PlansListResponse`) + provisioning status/step types reused from `tenant.ts`.
  - `apps/worker`: 7-step provisioning state machine (`provisioning/state-machine.ts`) with per-step persistence, resume-from-failed-step, terminal failure states, per-step tenant status transitions; `SimulationDriver` + `BenchDriver`; `provisioning.processor.ts` delegates to the state machine; `state-machine.spec.ts` (4 tests).
  - `apps/api`: `plans` module (GET catalog, `findByCode`), `provisioning` module (`GET /provisioning/status`), `WizardService.submit` upserts the tenant, creates the subscription, writes an AuditLog and enqueues a BullMQ `provision` job with an idempotency key (`BullModule` registered in `AppModule`); wizard spec extended (5 tests).
  - `apps/web`: setup wizard renders a live provisioning progress card polling `/provisioning/status` every 3s, routing to `/dashboard` once the tenant is `ACTIVE`.

## [0.2.0] - 2026-08-10

### Added
- **People module: Contacts (M2-025) (#30)** — list + detail reference UI matching the conventions landed in #25:
  - `packages/shared`: `contact` zod schema (`CON-\d{4}` codes, active/inactive status, `contactListQuerySchema`/`contactListResponseSchema`) in `schemas/contacts.ts`.
  - `apps/api`: `contacts` module with 10 seeded reference contacts — `GET /people/contacts` (search/status filter/sort/pagination) + `/:code` detail + create/update/remove, AuthGuard-protected; registered in `AppModule`.
  - `apps/web`: `/people` hub card, `/people/contacts` list (search, DataTable, "New contact" dialog) and `/people/contacts/[code]` detail (profile/summary + delete).

## [0.1.0] - 2026-08-10

### Added
- **Finance workspaces (M2-019..M2-024)** — invoicing, accounting, sign, equity, esg, and expense claims/categories, extending the M2 finance module:
  - `packages/shared`: domain schemas for invoicing (invoice, credit note, recurring), accounting (account, journal entry), sign (template, request, recipient, SIGN_* constants), equity (class, round, shareholder), esg (metric, board, policy, report) and expenses (expense claim + category).
  - `apps/api`: `invoicing`, `accounting`, `sign`, `equity`, `esg` modules + expense claim/category endpoints — list/detail/create/update/remove, zod-validated, envelope-shaped, service unit-tested, registered in `AppModule`.
  - `apps/web`: typed API clients for each module; full workspaces at `/finance/invoicing` (invoices, credit notes, recurring), `/finance/accounting` (accounts, journal entries), `/finance/sign` (templates, requests), `/finance/equity` (classes, rounds, shareholders), `/finance/esg` (metrics, board, policies, reports), `/finance/expenses/claims` (claims + categories, bulk approve/reject/archive); finance hub links to all.
  - All new surfaces implement the page contract (loading/empty/error/validation/success, responsive, a11y, dark mode) and pass `typecheck` + `lint` + `next build`.
- **M2 core workspaces (web + API)** — settings, notifications, global search, setup wizard, purchasing, finance and customers all wired end-to-end:
  - `apps/api`: `settings` (company/team/roles/plan/integrations/profile), `notifications`, `search` (global search index), `wizard` (onboarding draft/save/submit/status), `suppliers`, `purchase-orders`, `purchase-invoices`, `expenses`, `payments`, `finance` (overview + reports), and `customers` module fixes — all zod-validated, envelope-shaped, unit-tested; registered in `AppModule`. 223/223 API tests green.
  - `packages/shared`: settings, notifications, wizard, search (in `erp.ts`) schemas + `UpdateCompanySettingsInput`, `CreateCustomerInput`/`UpdateCustomerInput`, `CreateSupplierInput`/`UpdateSupplierInput`, `RecordPaymentInput`; seed services now use `structuredClone`.
  - `apps/web`: shared CSRF-aware `apiRequest` client; **Settings** workspace (company profile, team invite/roles, roles, plan & billing toggle, integrations toggles, profile) at `/settings/*`; **Setup wizard** at `/setup` (company → regional → business → team → import → review, auto-saves each step, provisions on submit); **global search** in the command menu (`Ctrl/⌘K`) against `/search`; **live notifications** bell (unread badge, mark read/all read); **Purchasing** workspace (suppliers, purchase orders, purchase invoices with status workflow + record payment) at `/purchasing/*`; **Finance** workspace (overview KPIs/aging/monthly totals, reports dialog, expenses, payments) at `/finance/*`; **Customers** workspace at `/sales/customers/*`; updated Sales/Purchasing hubs.
  - All new web surfaces implement the page contract (loading/empty/error/validation/success, responsive, a11y, dark-mode) and pass `typecheck` + `lint` + `next build`.
- **Sales & Inventory reference modules (M2-003..M2-008, PR #25)** — six modules built to the M1 dashboard standard:
  - `packages/shared`: `CustomerSummary` type export.
  - `apps/api`: `products`, `warehouses`, `stock-movements`, `quotations`, `sales-orders`, `sales-invoices` modules — list/detail/create/update/remove with zod-validated input, whitelisted sorting (fallback to `createdAt desc`), search, pagination; status workflows for quotations/orders/invoices; record-payment for invoices; 102 new unit tests across the six services.
  - `apps/web`: full page contract for each module — DataTable lists with search/sort/filter, new-record dialogs, detail views with status actions, KPI stat cards, loading/empty/error states, responsive + a11y baseline, dark mode.
  - Sales landing page now links to the live Sales orders workspace.
- **Leads pipeline (M2-002, PR #24)** — Sales module:
  - `packages/shared`: lead, activity, stage-stat, pipeline, list schemas + stage/source constants and stage probability map.
  - `apps/api`: `sales/leads` module — pipeline (stats + items), list, detail (with activity), create, update, move-stage, delete; zod-validated; 18 unit tests.
  - `apps/web`: kanban board with drag-and-drop stage moves (optimistic with rollback), DataTable list view with bulk move-to-stage, lead detail page (stage mover, notes, activity timeline, 404 handling), new-lead dialog, KPI stats (open pipeline, won value, win rate), debounced search, and full loading/empty/error states.
  - Sales landing page now links to the live Leads workspace.
- **Multi-agent coordination system** — mandatory workflow for concurrent agents:
  - `docs/coordination/README.md` protocol: session start via `pnpm agent:sync` (pull latest + print changelog + workboard), claim-before-build on `docs/coordination/WORKBOARD.md` (task ownership registry, one owner per task), branch-per-task PRs to `dev`, turf map (additive-only on `packages/ui`, `packages/shared`, board, changelog), session-report template.
  - `docs/coordination/WORKBOARD.md` task board: M1 marked done; M2 (Reference UI: wizard, sales/inventory/purchasing/finance/settings, palette/search/notifications) + M3 (provisioning, ERP client, isolation tests) + M4 backlog planned.
  - `docs/design/DESIGN.md` design-system reference: tokens, components, motion rules, chart patterns, page contract, dark-mode/a11y baseline.
  - `scripts/agent-sync.mjs` + root `pnpm agent:sync`; AGENTS.md §0 makes the protocol mandatory; README docs table + status updated.
- **Dashboard redesign** — `/dashboard` rebuilt as a command center:
  - Hero band with lazy-loaded React Three Fiber 3D floating shapes (WebGL, `frameloop`/reduced-motion aware) + aurora gradient + live status pill.
  - Animated KPI cards (framer-motion count-up, stagger entrance, hover lift) with SVG sparklines per KPI.
  - Chart zone: revenue-trend area chart with hover crosshair/tooltip and y/x grid labels, cash-position mini chart, receivables-aging bar list.
  - "Data as of" freshness line (from `overview.asOf`) and staggered entrances for alerts/activity lists.
  - Dashboard contract extended in `packages/shared` (`kpi.sparkline`, `revenueTrend`, `cashTrend`, `arAging`), with demo series in `apps/api`.
  - Added `three`, `@react-three/fiber` deps to `apps/web`.
- **M1 Foundation scaffold** — pnpm workspace + Turborepo; `apps/web` (Next.js), `apps/api` (NestJS), `apps/worker` (BullMQ); `packages/ui` (design system), `packages/db` (Prisma + platform schema + migrations), `packages/erp` (ERPNext typed client), `packages/shared` (API contract: zod schemas + envelope + error codes); infra docker compose (Postgres + Redis); CI workflow.
- **M1 Auth foundation (#3)** — full auth module in `apps/api`:
  - argon2id password hashing (OWASP params) via `@node-rs/argon2`.
  - Two-token sessions: short-lived access JWT (httpOnly `SameSite=Lax` cookie) + rotating refresh token (SHA-256 hashed at rest, per-family reuse detection revokes the whole session family).
  - CSRF double-submit (`x-csrf-token` header vs. `amni_csrf` cookie) on unsafe methods via `AuthGuard`.
  - Register (creates User + Company + OWNER Membership; dev auto email-verify), login (uniform errors, 10-fail escalating lockout), refresh, logout, verify-email, request/reset/change password, `GET /me`.
  - Redis-backed sliding-window rate limiting (`@nestjs/throttler` + ioredis), stricter on auth endpoints.
  - `ApiException` + `AllExceptionsFilter` now map shared error codes and zod validation to the envelope contract.
  - `@amni/db` dual-format build (ESM + CJS via tsup) so the CJS API can `require` the Prisma client.

### Changed
- Env: auth uses `ACCESS_TOKEN_SECRET` (+ `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS`); `.env.example` updated.

### Fixed
- CI workflow referenced a stale `JWT_SESSION_SECRET` secret; now uses `ACCESS_TOKEN_SECRET`.
- Dashboard chart grid overflowed: the right column stacked Cash + Receivables aging inside a row sized to the Revenue card, so the aging card rendered over the Quick Actions and Alerts sections. Receivables aging now sits on its own full-width row; the cash chart uses a sparkline variant (no unreadable sub-10px axis labels).
