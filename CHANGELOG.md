# Changelog

All notable changes to Amni are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/) and the repo uses [Conventional Commits](https://www.conventionalcommits.org/). Unreleased work lands on `dev` and is promoted here on merge.

## [Unreleased]

### Added (dev)
- **Onboarding email pipeline (M3-007, PR #49)** — verify/reset/welcome emails end-to-end:
  - `packages/shared`: `schemas/mail.ts` — `MailTemplate` constants + zod `mailJobSchema` discriminated union (`verification`/`reset`/`welcome`) + `MailJob` type.
  - `apps/api`: `JobsModule` (BullMQ `mail` queue) + `MailService.enqueue()`; `AuthService` enqueues welcome + verification on production registration, and reset on `request-password-reset` (replacing the `TODO(M5)` stubs).
  - `apps/worker`: `MailProcessor` validates jobs against the shared schema, renders escaped HTML/plain templates, and sends via `MailerService` — `console` provider in dev (logs the rendered message) or SMTP when `MAIL_PROVIDER=smtp` + `SMTP_HOST` set (nodemailer); `MAIL_FROM` + `PLATFORM_URL` configurable. Mail config documented in `apps/worker/.env.example` + `infra/docker/.env.example`.
  - Fixed a latent worker boot crash (`app.get(Logger)` on a non-provider) so `apps/worker` actually starts; verified live end-to-end.

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
