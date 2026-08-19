# Work Board — Task Ownership Registry

**The single source of truth for "who is working on what."** Protocol in `docs/coordination/README.md`.

Rules: one owner per task · claim before you build (commit the claim first) · never edit a row you don't own · statuses `planned` → `in-progress` → `done` (never back).

- Owner = your unique agent name. `—` = unclaimed.
- `M1` (Foundation) is **DONE** and listed for reference only — do not reopen.
- Tasks are listed newest milestone first. Pick from `planned` in your milestone.

---

## M2 — Premium ERP Reference UI (epic)

> Goal: every module from `PRODUCT_SPEC.md §6` built to the M1 dashboard standard, using `docs/design/DESIGN.md`. Track sub-tasks below; mark the epic `done` only when all sub-tasks are.

| Task | Milestone | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| **M2-000 Setup Wizard** (onboarding epic: company→regional→business→team→import→provision) | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | `/setup`; auto-save + submit; PR #25 |
| M2-001 Customers list + detail | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Sales module; DataTable; PR #25 |
| M2-002 Leads / Opportunities (pipeline) | M2 | agent-ui | done | feat/M2/leads-pipeline | Sales; PR #24 |
| M2-003 Quotations | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Sales; PR #25 |
| M2-004 Sales Orders | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Sales; PR #25 |
| M2-005 Sales Invoices + record payment | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Sales/Finance cross-cut; PR #25 |
| M2-006 Products list + detail | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Inventory; PR #25 |
| M2-007 Warehouses + Inventory stock levels | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Inventory; low-stock alerts; PR #25 |
| M2-008 Stock Movements | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Inventory; PR #25 |
| M2-009 Suppliers | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Purchasing; PR #25 |
| M2-010 Purchase Orders | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Purchasing; PR #25 |
| M2-011 Purchase Invoices | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Purchasing; PR #25 |
| M2-012 Financial Overview + Reports | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Finance; revenue/AR/AP/cash KPIs; PR #25 |
| M2-013 Expenses + Payments | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Finance; PR #25 |
| M2-014 Settings: Company / Team & roles | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Self-serve admin; PR #25 |
| M2-015 Settings: Plan & billing / Integrations / Profile | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | PR #25 |
| M2-016 Command palette (Cmd/Ctrl-K) | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | `packages/ui` Command primitives; PR #25 |
| M2-017 Global search (top bar) | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | PR #25 |
| M2-018 Notifications center (top bar) | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Worker `notify` job exists; UI only; PR #25 |
| M2-019 Invoicing (invoices, credit notes, recurring) | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Finance; PR #25 |
| M2-020 Accounting (chart of accounts, journal entries) | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Finance; PR #25 |
| M2-021 Sign (e-signature templates, requests) | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Finance; PR #25 |
| M2-022 Equity (cap table, classes, rounds, shareholders) | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Finance; PR #25 |
| M2-023 ESG (metrics, board, policies, reports) | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Finance; PR #25 |
| M2-024 Expense claims + categories | M2 | agent-sales-inventory | done | feat/M2/sales-inventory | Finance; extends M2-013; PR #25 |
| M2-025 People: Contacts list + detail | M2 | agent-amni-01 | done | feat/M2/people-contacts | People module (nav: Contacts, access); new task; PR #30 |

---

## M1 — Foundation (DONE — reference only)

| Task | Milestone | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| M1-000 Monorepo scaffold + CI + design system | M1 | platform | done | — | See CHANGELOG |
| M1-001 Auth (register/login/session/refresh/CSRF/lockout) | M1 | platform | done | — | See CHANGELOG |
| M1-002 Dashboard (hero 3D, animated KPIs, charts) | M1 | platform | done | — | `apps/web/app/(app)/dashboard`; see DESIGN.md §4 |

---

## M3 — Tenant + Provisioning (epic — next after M2)

> Goal: real multi-tenant ERP provisioning driven by the state machine (`apps/worker`), ERPNext client (`packages/erp`) wired through the API, isolation tests. See `ARCHITECTURE.md` + `DISCOVERY_REPORT.md`. Agent-to-agent thread: `docs/coordination/COMMS.md`.

| Task | Milestone | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| **M3-000 Provisioning state machine** (site create → configure → ERP ready; idempotent, retries, progress events) | M3 | agent-m3-provisioning | done | feat/M3/provisioning | `apps/worker/src/provisioning/state-machine.ts` + drivers; shipped via PR #51 |
| M3-001 `packages/erp` client v1 (login, resource CRUD, tenant service-account) | M3 | agent-amni-01 | done | feat/M3/erp-gateway | PR #41; login/session, AES-256-GCM service-key crypto, resolveTenantErp; 35 tests. Reassigned from agent-m3-erp (operator) |
| M3-002 `ErpGatewayModule` (tenant-scoped proxy endpoints + audit) | M3 | agent-amni-01 | done | feat/M3/erp-gateway | PR #41; /api/v1/erp/* proxy + AuditLog on mutations; built against mock ERP so CI stays green. Reassigned from agent-m3-erp (operator) |
| M3-003 Company creation + plan selection API | M3 | agent-m3-provisioning | done | feat/M3/provisioning | `apps/api/src/plans` + wizard submit (tenant/subscription/audit); shipped via PR #51 |
| M3-004 ERP status surfacing (wizard progress → dashboard) | M3 | agent-m3-provisioning | done | feat/M3/provisioning | `GET /provisioning/status` + wizard progress card → dashboard on ACTIVE; shipped via PR #51 |
| M3-005 Tenant isolation test suite (two tenants, cross-access 403/404) | M3 | agent-amni-01 | done | feat/M3/erp-gateway | PR #41; test:isolation + mock Frappe REST sites; 9 cases. Mandatory before any ERP data path ships (TESTING.md); reassigned from agent-m3-erp (operator) |
| M3-006 Wizard completion → enqueue provision job | M3 | agent-m3-provisioning | done | feat/M3/provisioning | BullMQ `provision` enqueue w/ idempotency key; shipped via PR #51 |
| M3-007 Onboarding email (verify/reset/welcome) via worker `mail` | M3 | agent-amni-01 | done | feat/M3/onboarding-mail | PR #49; shared mail job schema, API enqueue (register/reset/verify), worker render + console/smtp send; 14 worker + 5 api tests. Reassigned from agent-m3-erp (operator) |

---

## M4 — Data Import + Notifications (backlog)

| Task | Milestone | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| **M4-000 Data import pipeline (6-stage UX, CSV/XLSX, batch, rollback)** | M4 | — | done | fix/pr52-sync | Epic umbrella; all subtasks done (M4-001..M4-006). See PRODUCT_SPEC §5. |
| M4-001 In-app notifications persistence (`Notification` model, notify processor) | M4 | agent-ui | done | fix/pr52-sync | Swap in-memory seed → DB (worker persist + API read); contract unchanged. `notify.processor.ts` + notifications controller/service; isolation tests. |
| M4-002 Import shared schemas (upload, mapping, validation, preview, envelopes) | M4 | agent-amni-01 | done | feat/M4/imports-notifications | `schemas/import.ts` extended + `import-engine.ts` (templates, mapping, validation); PR #52 |
| M4-003 Import API module (`/api/v1/imports/*`: create/upload/mapping/validate/execute/summary/error-rows/rollback + templates) | M4 | agent-amni-01 | done | feat/M4/imports-notifications | Zod-validated, audited; CSV/XLSX parsing; PR #52 |
| M4-004 Worker imports processor (parse/validate/batch/progress/summary/error rows) | M4 | agent-amni-01 | done | feat/M4/imports-notifications | `apps/worker/src/jobs/imports.processor.ts` implemented; enqueues NOTIFY jobs → M4-001; PR #52 |
| M4-005 ERPNext import integration + tenant isolation tests | M4 | agent-ui | done | fix/pr52-sync | kind→doctype mapping, `packages/erp` methods (feeds M4-004), two-tenant suite (`imports.isolation.spec.ts`). |
| M4-006 Import web UX (6-stage wizard + templates) | M4 | agent-ui | done | fix/pr52-sync | Per PRODUCT_SPEC §5; 6-stage wizard at `/imports` (template download, CSV/XLSX upload, auto-mapping, validation, live import, summary/rollback). |

---

## CRM — Deals & Engagement (epic — DONE)

> Goal: close the gap vs Frappe CRM. Baseline already shipped: Leads (stages, sources, value, probability, kanban, pipeline stats), Contacts, Customers. Reference patterns: reusable skill **`crm-ui-patterns`** (all-in-one record page, kanban, saved views, email templates, call UI) — load it before building. All work is demo-data-surface like the rest of M2 (no ERP dependency), so it is **not blocked** by the ERP cluster. Branch prefix `feat/crm/`. Full module (orgs, contacts, tasks, notes, activities, views, events, call-logs, email-templates, whatsapp, notifications, settings) shipped via PR #54.

| Task | Milestone | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| CRM-000 Deals/Opportunities entity (schema + API + kanban/table UI, mirrors leads) | CRM | agent-crm | done | feat/crm/deals | Schema+API+kanban/table+detail; PR #50 |
| CRM-001 Comments & threaded discussions on records | CRM | agent-crm | done | feat/crm/full | Activity timeline + activities module; shipped in full CRM module PR #54 |
| CRM-002 Tasks / checklists on records | CRM | agent-crm | done | feat/crm/full | tasks module + kanban/table/detail UI; shipped in full CRM module PR #54 |
| CRM-003 Saved custom views (named view presets) | CRM | agent-crm | done | feat/crm/full | views module + list presets; shipped in full CRM module PR #54 |
| CRM-004 Outreach email templates (placeholders + send via worker `mail`) | CRM | agent-crm | done | feat/crm/full | email-templates module + dialog UI; shipped in full CRM module PR #54 |
| CRM-005 Call UI + call logs (Twilio/Exotel) | CRM | agent-crm | done | feat/crm/full | call-logs module + log-call dialog; shipped in full CRM module PR #54 |
| CRM-006 WhatsApp surface | CRM | agent-crm | done | feat/crm/full | whatsapp module + send dialog; shipped in full CRM module PR #54 |

---

## M5 — Market-ready ERP (epic — data wiring + HRMS embed)

> Goal: make the platform market-ready by wiring every reference module to each tenant's **real ERPNext site** — the original "ERP gateway lands (M5)" plan — replacing in-memory demo data with live reads/writes, plus finishing the HRMS embed. Mandatory per module: `packages/erp` domain methods + tenant isolation tests + (where applicable) real-bench integration tests (TESTING.md §4). **Two parallel agent tracks own disjoint files so they never collide**: Track A owns `packages/erp/src/{sales,inventory}.ts` + sales/inventory API modules; Track B owns `packages/erp/src/{purchasing,finance}.ts` + purchasing/finance API modules. `mock-frappe-server.ts` is extended additively only. Contract shapes never change (frontend untouched except wiring).

| Task | Milestone | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| M5-000 HRMS embed: hrms app install, amni_bridge SSO, /hrms UI | M5 | agent-platform | done | feat/M5/hrms-embed | PR #53 merged → dev; bench verified live: erpnext 16.30 + hrms + amni_bridge installed on site localhost, AMNI_SSO_SECRET set (matches apps/api HRMS_SSO_SECRET). Ops: db:migrate + install-hrms.ps1 + HRMS_SSO_SECRET. Follow-up: commit nested `amni_bridge` layout (flat-layout fix) + harden install-hrms.ps1 line 37. |
| **M5-001 ERP data wiring — Sales & Inventory (Track A foundation)** | M5 | agent-m5-erp-sales-inv | done | feat/M5/erp-sales-inv | `packages/erp/src/sales.ts` (Customer/Lead/Contact/Quotation/SalesOrder/SalesInvoice/Payment doctype methods + field maps) + `inventory.ts` (Item/Warehouse/StockMovement); submit/cancel via client; 14 unit + 7 isolation tests. ALSO fixed pre-existing mock-frappe-server bug: URL path segments now decoded (doctype names with spaces like "Sales Order" 404'd before). Fixed pre-existing hrms.service.ts lint (`import type ConfigService`). |
| M5-002 Sales & Inventory API wiring (replace seed → ERPNext reads/writes, same contract) | M5 | agent-m5-erp-sales-inv | done | feat/M5/erp-sales-inv | All 10 sales/inventory modules ERP-backed (customers, products, warehouses, stock movements, leads, deals, contacts, quotations, sales orders, sales invoices, record-payment) via `ErpGatewayService` (scopeFor/audit/translateErpError); additive `Opportunity` support in `packages/erp` for deals; in-scope `code` schemas relaxed to `min(1).max(80)` (code = ERPNext doc name); 6 new per-module isolation specs (+24 tests) → 476 api tests green; COMMS M5-COMMS-003 |
| **M5-003 Sales/Inventory dashboard KPIs + E2E sales journey** | M5 | agent-m5-erp-sales-inv | done | feat/M5/erp-sales-inv | revenue/AR/aging/low-stock KPIs from real ERP; Playwright signup→wizard→provision→customer→product→order→invoice→payment (apps/e2e) |
| **M5-004 ERP data wiring — Purchasing & Finance (Track B foundation)** | M5 | agent-m5-erp-purch-fin | done | feat/M5/erp-purch-fin | `packages/erp/src/purchasing.ts` (Supplier/PurchaseOrder/PurchaseInvoice) + `finance.ts` (ExpenseClaim/JournalEntry/Account/PaymentEntry); doctype field maps; unit + isolation tests. Implemented by agent-amni-01 (operator). PR #55 |
| M5-005 Purchasing & Finance API wiring (replace seed → ERPNext reads/writes, same contract) | M5 | agent-m5-erp-purch-fin | done | feat/M5/erp-purch-fin | suppliers, purchase orders, purchase invoices, expenses, payments wired through ErpGatewayService (code = ERPNext doc name, audit on mutations, status derived from docstatus/status, recordPayment = Payment Entry Pay/Supplier). Finance dashboard overview/report aggregated from Sales/Purchase Invoices + Payment Entries + Expense Claims. Isolation suites per module (mock-frappe-server is now doctype-aware + honors ?action=submit\|cancel). Implemented by agent-amni-01 (operator). PR #55 |
| M5-006 Finance dashboard KPIs + E2E finance journey | M5 | agent-m5-erp-purch-fin | done | feat/M5/erp-purch-fin | AP/cash/expense/reporting KPIs from real ERP (revenue/AR from submitted Sales Invoices, AP from Purchase Invoices, cash from net Payment Entries, expenses from Expense Claims; aging buckets by due date; statement reports computed from the same doctypes). E2E finance journey not run (deployment paused). Implemented by agent-amni-01 (operator). PR #55 |
| M5-007 Real-bench integration test tier + CI gates | M5 | agent-m5-erp-purch-fin | done | feat/M5/erp-purch-fin | CI runs `pnpm test:isolation` on every PR + merge-to-dev gate; TESTING.md §4/§8 updated (in-repo isolation harness documented as always-on). Real frappe_docker supertest tier remains parked until the bench is reachable (deployment paused). Also fixed pre-existing worker lint (`import type` in imports.processor.spec). Implemented by agent-amni-01 (operator). PR #55 |

---

## M10 — Market launch hardening

> Goal: remove the remaining no-go findings from `docs/MARKET_READINESS_REVIEW.md` without violating the two-store architecture: tenant business records stay in each tenant ERP site, authorization remains server-derived, and production operations are reproducible and tested.

| Task | Milestone | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| **M10-001 CRM durable tenant persistence** | M10 | codex-market-launch | done | feat/M10/crm-durable-persistence | Tenant-local Amni Bridge persistence, bounded indexes, demo records, two-tenant isolation, automatic site migration, and real-bench restart proof. [PR #69](https://github.com/Aa070078/amni/pull/69) |
| **M10-002 Accounting + invoicing durable ERP persistence** | M10 | codex-market-launch | done | feat/M10/accounting-invoicing-persistence | Native tenant Account, Journal Entry, GL Entry, return Sales Invoice, Purchase Invoice, and Auto Repeat persistence; restricted-token restart gate and isolation coverage. [PR #70](https://github.com/Aa070078/amni/pull/70) |
| **M10-003 Equity, ESG, and signing tenant persistence** | M10 | codex-market-launch | done | feat/M10/noncore-domain-persistence | [PR #71](https://github.com/Aa070078/amni/pull/71) — dedicated tenant-local Amni Domain Record, audited membership-resolved APIs, two-site isolation, demo fixtures, and real-bench restart durability gate. |
| **M10-004 Specialist roles and domain authorization** | M10 | codex-market-launch | done | feat/M10/roles-settings-persistence | PR #72; durable settings/invitations/expense categories, provider-honest billing/integrations, specialist server authorization + filtered navigation. |
| **M10-005 Bounded ERP queries + tenant data-plane health** | M10 | codex-market-launch | done | feat/M10/bounded-queries-tenant-health ([PR #73](https://github.com/Aa070078/amni/pull/73)) | Added an allow-listed bounded ERP query/count path, tenant/role-scoped search, recurring health probes, and degraded workspace UX. |
| **M10-006 Real-ERP release gate** | M10 | codex-market-launch | done | feat/M10/real-erp-release-gate ([PR #74](https://github.com/Aa070078/amni/pull/74)) | Clean-site restricted-account gate covers submitted sales/purchasing/payments, accounting, CRM/domain persistence, restart durability, and main/nightly CI. |
| **M10-007 Production operations + staged pilot** | M10 | — | planned | — | Deployment, TLS, secrets, backups/restores, upgrades, monitoring, incident/rollback runbooks, volume/security pilot. |

---

## M9 — Production-readiness, onboarding reliability, and workspace UX

> Goal: make a newly registered company reach a usable workspace, enforce the product permission model server-side, separate CRM from Sales in the information architecture, audit every primary page in a real browser, and close the highest-impact usability defects without overstating launch readiness.

| Task | Milestone | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| **M9-001 Provisioning credentials + first-workspace recovery** | M9 | codex-product-readiness | done | feat/M9/product-readiness | Dedicated ERP token user/roles, encrypted credentials, activation probe, retry/recovery, and fresh-signup worker path completed. [PR #68](https://github.com/Aa070078/amni/pull/68) |
| **M9-002 Server-side domain authorization baseline** | M9 | codex-product-readiness | done | feat/M9/product-readiness | Owner/admin unsafe-method baseline with explicit member self-service exceptions and negative/live 403 tests completed. [PR #68](https://github.com/Aa070078/amni/pull/68) |
| **M9-003 CRM information-architecture separation** | M9 | codex-product-readiness | done | feat/M9/product-readiness | CRM is a standalone `/crm` workspace; legacy Sales CRM URLs redirect. [PR #68](https://github.com/Aa070078/amni/pull/68) |
| **M9-004 Cross-page UI/UX and dashboard optimization** | M9 | codex-product-readiness | done | feat/M9/product-readiness | Desktop/mobile/light/dark audit completed; dashboard, Sales, setup, errors, accessibility, and record routing refined. [PR #68](https://github.com/Aa070078/amni/pull/68) |
| **M9-005 Full-story verification + launch assessment** | M9 | codex-product-readiness | done | feat/M9/product-readiness | Real ERP bootstrap/token probe plus 565 unit, 84 isolation, and two full Playwright journeys passed; remaining no-go blockers documented. [PR #68](https://github.com/Aa070078/amni/pull/68) |

---

## M8 — Market readiness stabilization + product experience

> Goal: reproduce and eliminate the live admin/member dashboard failures and slow module loads, audit the platform for release-blocking correctness/security/performance gaps, verify the critical journeys against the running Docker/ERP environment, and raise the landing/dashboard experience to the Amni design-system standard.

| Task | Milestone | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| **M8-000 Runtime stabilization + market-readiness audit + landing/dashboard UX refresh** | M8 | codex-market-readiness | done | feat/M8/market-readiness | Dashboard snapshot, membership-derived roles, ERP-offline UX, auth-log redaction, sales-list hardening, Windows verification fixes, development ERP stand-in, and responsive landing redesign completed. Full review: `docs/MARKET_READINESS_REVIEW.md`. [PR #66](https://github.com/Aa070078/amni/pull/66) |

---

## M7 — Demo seed + tenant provisioning (dev)

> Goal: make the demo accounts actually work post-M5. Root cause of the dashboard 409s (`TENANT_NOT_READY`): the old `seed-demo-user.ts` put **both** demo users in one "Demo Co" and created **no** `Tenant`/`ERPInstance`, so every ERP-backed read (`/api/v1/dashboard/*`) 409'd. Fix: seed a **pure SaaS platform admin** (no company membership, lands on `/admin` console) plus **one normal company** with its own isolated ERPNext instance and two accounts inside it (company admin/OWNER + employee/MEMBER). Two disjoint agents; files never overlap.

| Task | Milestone | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| **M7-001 SaaS admin demo → SaaS console (A)** | M7 | agent-amni-01 | done | feat/M7/saas-admin-demo | New `apps/api/scripts/seed-saas-admin.ts`: upsert `owner@amni.com` (`isPlatformAdmin: true`, **no** membership, ACTIVE/verified). Post-login redirect for platform admins → `/admin` in `apps/web/app/login/{login-form,quick-login}.tsx` + quick-login label (SaaS Admin / Company Admin / Company Member). Verified live: login 201, `/auth/me` `isPlatformAdmin: true`, `/api/v1/admin/{summary,tenants}` 200, memberships=0. **Merged to dev as `ab2af60` (PR #63)**. Remaining cross-check (needs M7-002): `/admin` tenants table lists Demo Co. |
| **M7-002 Company demo seed (admin + member) → company dashboard (B)** | M7 | agent-amni-01 (operator; reassigned from agent-m7-company-demo) | done | feat/M7/company-demo-seed | New `apps/api/scripts/seed-demo-company.ts`: one company **Demo Co** (`demo-co`) with two memberships — `admin@demo.amni`/`admin12345` OWNER + `member@demo.amni`/`member12345` MEMBER — plus ACTIVE `Tenant` + `ERPInstance` (host `http://localhost:8080`, HEALTHY, `serviceKeyCipher` via running `ENCRYPTION_KEY`, overridable `DEMO_ERP_API_KEY`/`DEMO_ERP_API_SECRET`) + TRIAL `Subscription`. Also fixed pre-existing `Tenant.hrmsInstalled` schema drift (`@map("hrms_installed")`) and the M5 `reorder_level`→`safety_stock` Item-field bug (real bench 417; mock never validates fields). **Verified live on the frappe_docker bench** (site `frontend`, ERPNext 16.30): login 201 for both accounts, `/api/v1/dashboard/{overview,activity,alerts}` → 200 (admin 4 KPIs; member `?role=member` revenue-only). **PR #1 on `feat/M7/company-demo-seed`** (commits `d129c42`, `f39046e`, `d456db5`, `fc90c50`). COMMS M7-COMMS-002. |

---

## M6 — Onboarding gaps + Platform Admin console (SaaS)

> Goal: close the onboarding gaps surfaced in the userflow review — (1) signup copy promised background provisioning that never happened, (2) the setup wizard was unreachable except via ⌘K, (3) no server-side route guard — and ship the missing **platform admin dashboard** so the operator sees every tenant with its status, plan, subscription, provisioning job trail, members and ERP instance. Decision (operator, 2026-08-15): provisioning stays at wizard submit (honest copy + route new signups through the wizard), matching PRODUCT_SPEC + SECURITY.md email-verify-before-provision.

| Task | Milestone | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| M6-001 Server-side route guard (Next.js middleware; no session cookie → `/login`) + login `next` param | M6 | agent-amni-01 | done | fix/onboarding-gaps | `apps/web/middleware.ts`; one-directional (no cookie→skip-login redirect) to avoid httpOnly-cookie redirect loops. PR #61 |
| M6-002 Onboarding flow fix (honest signup copy + new signups land on `/setup` wizard; e2e updated) | M6 | agent-amni-01 | done | fix/onboarding-gaps | provisioning stays at wizard submit (SECURITY.md email-verify gate). PR #61 |
| M6-003 Platform admin identity: `User.isPlatformAdmin` + migration + seed flags | M6 | agent-amni-01 | done | feat/admin-dashboard | `demo@amni.dev` + `admin@amni.dev` flagged platform admins. PR #62 |
| M6-004 Admin API (`/admin/summary`, `/admin/tenants`, `/admin/tenants/:id`) + AdminGuard + shared schemas | M6 | agent-amni-01 | done | feat/admin-dashboard | 403 for non-admins; 5 unit tests. PR #62 |
| M6-005 Admin console web UI (`/admin` shell, summary cards, tenants table, tenant detail w/ provisioning timeline) | M6 | agent-amni-01 | done | feat/admin-dashboard | `/auth/me` returns `isPlatformAdmin`; user-menu entry. PR #62 |

---

## Change log of the board itself

| Date | Change |
|---|---|
| 2026-08-18 | **M10-001 completed** (codex-market-launch, [PR #69](https://github.com/Aa070078/amni/pull/69)): all CRM process-local stores now persist in each membership-resolved ERP site through Amni Bridge; API tests, 86 isolation tests, and real ERPNext create/list/restart/read-back verification passed. |
| 2026-08-19 | **M10-002 completed** (codex-market-launch, [PR #70](https://github.com/Aa070078/amni/pull/70)): accounting and invoicing process-local stores now use native tenant ERPNext records; 88 isolation checks and a restricted service-token Account/Journal/credit-note/Auto Repeat restart durability gate passed. |
| 2026-08-19 | **M10-006 completed** (codex-market-launch, [PR #74](https://github.com/Aa070078/amni/pull/74)): the pinned clean-site release gate provisions restricted credentials, exercises and submits critical ERP flows, proves restart durability, and caught/fixed the ineffective legacy submit/cancel transport. |
| 2026-08-18 | **M9 product-readiness completed** (codex-product-readiness, [PR #68](https://github.com/Aa070078/amni/pull/68)): closed the original ERP credential/role, domain-authorization, and reproducible ERP-stack P0s; made provisioning recoverable; persisted tenant-scoped onboarding/settings; separated CRM; refined responsive UX; and fixed duplicate product creation, encoded detail routes, and unallocated invoice payments. Lint, 14 typecheck tasks, 565 unit tests, 84 isolation tests, two Playwright journeys, and a clean real ERPNext/HRMS/Amni Bridge site/token probe passed. Market launch remains no-go pending process-local domain-store replacement and documented P1 gates. |
| 2026-08-18 | **M8-000 completed** (codex-market-readiness, [PR #66](https://github.com/Aa070078/amni/pull/66)): reproduced the admin/member dashboard failures, restored the local ERP-backed experience with a development stand-in, consolidated dashboard reads, fixed server-derived role filtering and auth-log redaction, hardened omitted ERP child rows, removed Windows verification races, refreshed the landing page, and documented the remaining P0/P1 launch blockers in `docs/MARKET_READINESS_REVIEW.md`. Root lint/typecheck/build and 562 tests pass; desktop/mobile browser journeys verified. |
| 2026-08-16 | **M7-002 implemented + verified live** (agent-amni-01, PR #1 on `feat/M7/company-demo-seed`): `seed-demo-company.ts` seeds Demo Co (`demo-co`) with admin/member accounts + ACTIVE Tenant + ERPInstance (real bench creds ciphered) + TRIAL sub. Live-verified on frappe_docker bench (site `frontend`): dashboard overview/activity/alerts 200 for both accounts; member `?role=member` = revenue-only KPI. Also fixed pre-existing `Tenant.hrmsInstalled` schema drift (`@map`) and the M5 Item `reorder_level`→`safety_stock` bug (mock never validated fields; real bench 417'd). Provisioning gap flagged (bench service account has no api_key/roles) — COMMS M7-COMMS-002. |
| 2026-08-16 | **M7-001 merged to dev** — PR #63 squash as `ab2af60` (agent-amni-01): seed-saas-admin.ts + platform-admin → `/admin` redirect + quick-login demo accounts. M7-002 (company seed) in-progress (reassigned to operator lane). |
| 2026-08-16 | **M7-001 implemented** (agent-amni-01, PR #63 on `feat/M7/saas-admin-demo`): `seed-saas-admin.ts` (`owner@amni.com`, platform admin, no membership) + platform-admin post-login redirect → `/admin` in login-form + quick-login (demo accounts updated: SaaS Admin `owner@amni.com`, Company Admin `admin@demo.amni`, Company Member `member@demo.amni`). Live-verified login/auth-me/admin API 200. M7-002 (company seed) in-progress (reassigned to operator lane). |
| 2026-08-16 | M7-002 reassigned by operator from agent-m7-company-demo → agent-amni-01 (operator lane) on `feat/M7/company-demo-seed`; implementation started (seed script + env key wiring). COMMS M7-COMMS-001. |
| 2026-08-16 | **M7 registered + claimed**: demo seed + tenant provisioning. Root cause of dashboard 409s = old `seed-demo-user.ts` put both demo users in one "Demo Co" with no Tenant/ERPInstance. M7-001 (agent-amni-01, `feat/M7/saas-admin-demo`): `owner@amni.com` pure SaaS platform admin (no membership) → lands on `/admin` console. M7-002 (agent-m7-company-demo, `feat/M7/company-demo-seed`): one company Demo Co with `admin@demo.amni` OWNER + `member@demo.amni` MEMBER + own isolated Tenant/ERPInstance/subscription → both land on `/dashboard`. Claims committed; implementation not started. |
| 2026-08-15 | M6 registered + claimed (agent-amni-01): onboarding gaps (route guard, signup→wizard flow) on `fix/onboarding-gaps`; platform admin console (identity, API, web UI) on `feat/admin-dashboard`. Decision: provisioning stays at wizard submit. |
| 2026-08-15 | **EPIC M6 complete** — PR #61 merged (onboarding gaps: route guard + signup→wizard flow); admin console (identity + API + web UI) merged via PR #62 (squash) — M6-003/004/005 done. `/admin` console is platform-admin-only (AdminGuard 403 for non-admins; client-side access-denied state). Note for future agents: pre-existing schema drift (`hrms_installed` in the M5-000 migration vs `hrmsInstalled` in `schema.prisma`) left untouched — see COMMS M6-COMMS-001. |
| 2026-08-15 | PR #46 merged to dev (68babf5, squash): landing page redesign — sticky blur header, framer-motion hero (`landing-hero.tsx`), feature cards (`landing-features.tsx`), footer. Branch `feat/landing-redesign` synced onto latest dev before merge (conflict resolved in `apps/web/app/page.tsx`, dev's hero tweaks superseded by the new `LandingHero`). |
| 2026-08-15 | PR #47 merged to dev (80f21d0, squash): web API clients default to same-origin `/api/v1` when `NEXT_PUBLIC_API_BASE_URL` is unset (preview-tunnel fix). Follow-up noted: `deals.ts` + `imports.ts` still carry the old localhost default (added to dev after #47 branched). |
| 2026-08-15 | **EPIC M5 complete** — PR #55 merged to dev (c923a33, squash): M5-004..M5-007 (Track B) landed — purchasing/finance ERP wiring + finance dashboard KPIs + isolation CI gate. Combined with Track A (PR #56), the M5 market-readiness epic is now done. Pre-merge sync fixed the Track A↔B PaymentEntry symbol collision (Track A renamed to `Sales*`, Track B canonical) and rebuilt COMMS/WORKBOARD docs. COMMS M5-COMMS-006/007. |
| 2026-08-14 | CI unblock (agent-m5-erp-sales-inv): removed broken `cache: pnpm` post-step from all 4 CI jobs — it failed every job repo-wide (`Path Validation Error` in actions/setup-node) while all real steps passed; added `.gitleaks.toml` allowlist for e2e test-only mock fixtures; fixed pre-existing worker spec `typeof import()` lint + root `nanoid@^3.3.18` audit override. COMMS M5-COMMS-005. |
| 2026-08-14 | M5-000 marked done (agent-platform): PR #53 merged to dev (b8d849e) — HRMS embed live. M5-003 marked done (agent-m5-erp-sales-inv): ERP-backed dashboard KPIs + e2e suite landed on feat/M5/erp-sales-inv (PR #56); AP KPI remains deferred to Track B (M5-005). COMMS M5-COMMS-004. |
| 2026-08-14 | M5-003 (agent-m5-erp-sales-inv): Playwright E2E suite added under apps/e2e (@amni/e2e) covering the critical journey signup→wizard→provision + seeded-owner customer→product→order→invoice→payment→dashboard KPIs; global-setup seeds a fresh tenant against an in-process mock Frappe server and skips gracefully when Postgres/Redis are down; onboarding spec requires Redis. Commits 4e975a7 (KPIs) + 0ebe101 (E2E). |
| 2026-08-14 | M5-003 claimed (agent-m5-erp-sales-inv) and dashboard KPIs wired: overview/alerts/activity now read the tenant ERP site (Sales Invoice grand_total/outstanding_amount/due_date, Payment Entries, Bin/Item stock) via ErpGatewayService + new WarehousesService.stockSummary; same dashboard contract; AP KPI deferred to Track B (M5-005). 484 api tests green. |
| 2026-08-14 | M5-004..M5-007 (Track B) claimed by agent-amni-01 (operator): purchasing/finance ERP data wiring on feat/M5/erp-purch-fin. COMMS M5-COMMS-002. |
| 2026-08-14 | M5-000 marked done (agent-platform): HRMS embed shipped via PR #53 (merged into dev). Bench verified live: erpnext 16.30 + hrms + amni_bridge installed on site `localhost`, AMNI_SSO_SECRET set in bench config (matches apps/api HRMS_SSO_SECRET). Follow-ups registered: commit nested `amni_bridge` layout + harden install-hrms.ps1 quoting. |
| 2026-08-14 | CRM-001..CRM-006 marked done (agent-crm): full CRM module shipped via PR #54 — organizations, contacts, tasks, notes, activities/timeline, saved views, events, call-logs, email templates, WhatsApp, notifications, settings. Epic closed. |
| 2026-08-14 | M5-002 marked done (agent-m5-erp-sales-inv): all 10 sales/inventory modules ERP-backed via ErpGatewayService; deals backed by Opportunity (additive packages/erp); code schemas relaxed to min(1).max(80); 6 per-module isolation specs added (476 api tests green). COMMS M5-COMMS-003. |
| 2026-08-11 | M5-000 claimed (agent-platform): HRMS embed — hrms app in provisioning, amni_bridge SSO/theme app, /hrms UI. Shipped via PR #53. |
| 2026-08-11 | M3 task table repaired: all M3 rows done (markers from the #51 squash-merge removed). |
| 2026-08-11 | M3-000/M3-003/M3-006/M3-004 marked done (agent-m3-provisioning); shipped via PR #51 (feat/M3/provisioning). Worker state machine + drivers + spec, plans module, wizard→enqueue, provisioning status surfacing. |
| 2026-08-11 | CRM-000 Deals marked done; PR #50 open (agent-crm) — shared schema, API module, kanban/table/detail UI, `/sales/deals` routes. |
| 2026-08-11 | CRM-000 Deals claimed by agent-crm → in-progress on feat/crm/deals. |
| 2026-08-10 | CRM epic registered (7 planned tasks, owner agent-crm, prefix feat/crm/): Deals, comments, tasks, saved views, email templates, calls, WhatsApp. Skill `crm-ui-patterns` is the reference. Not ERP-blocked. |
| 2026-08-10 | M3-001/M3-002/M3-005 marked done: ERP client v1 + ErpGatewayModule + isolation suite, PR #41 (agent-amni-01). Built against mock ERP sites so CI stays green without a bench. |
| 2026-08-10 | M3-001/M3-002/M3-005 reassigned by operator from agent-m3-erp → agent-amni-01 (branch feat/M3/erp-gateway). |
| 2026-08-10 | M3-007 marked done: onboarding email pipeline (shared contract + API enqueue + worker render/send), PR #49 (agent-amni-01). |
| 2026-08-10 | M3-007 claimed by agent-amni-01 (operator reassignment from agent-m3-erp). Branch feat/M3/onboarding-mail. |
| 2026-08-11 | M4-002/M4-003/M4-004 marked done (agent-amni-01): shared import schemas + engine, `/api/v1/imports/*` module, worker processor. Live smoke test green. COMMS M4-COMMS-003. |
| 2026-08-11 | M4 split revised (operator): agent-amni-01 → M4-002/M4-003/M4-004; agent-ui → M4-001/M4-005/M4-006. COMMS M4-COMMS-002. |
| 2026-08-11 | M4 planned breakdown registered (operator split): M4-001..M4-005 → agent-amni-01 (backend); M4-006 → agent-ui (web UX). COMMS M4-COMMS-001. |
| 2026-08-10 | M3 claimed: M3-000/M3-003/M3-006/M3-004 → agent-m3-provisioning (feat/M3/provisioning); M3-001/M3-002/M3-005 → agent-m3-erp (feat/M3/erp-gateway); M3-007 → agent-m3-erp (feat/M3/onboarding-mail). |
| 2026-08-10 | M2-025 People: Contacts marked done; PR #30 (agent-amni-01). Supersedes the earlier PR #26 (closed) after PR #25 merged the Purchasing + finance epic into `dev`. |
| 2026-08-09 | M2-000, M2-001, M2-009..M2-018 marked done, plus new finance workspaces M2-019..M2-024 (invoicing, accounting, sign, equity, esg, expense claims/categories) — all on `feat/M2/sales-inventory`, delivered via PR #25. Epic is code-complete; merge to `dev` is the remaining gate. |
| 2026-08-09 | M2-003..M2-008 (quotations, sales orders, sales invoices, products, warehouses, stock movements) marked done; PR #25 open (agent-sales-inventory), stacked on PR #24. |
| 2026-08-08 | M2-002 Leads marked done; PR #24 open (agent-ui). |
| 2026-08-08 | Bugfix to M1-002 (dashboard): chart-grid overflow fixed so Receivables aging no longer overlaps Quick Actions/Alerts; cash chart converted to sparkline variant. Committed `035d82f` on `dev`. |
| 2026-08-07 | Board created: M1 marked done; M2/M3/M4 planned tasks registered. |
