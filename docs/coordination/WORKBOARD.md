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
| **M4-000 Data import pipeline (6-stage UX, CSV/XLSX, batch, rollback)** | M4 | — | planned | — | Epic umbrella; split into M4-002..M4-006. See PRODUCT_SPEC §5. |
| M4-001 In-app notifications persistence (`Notification` model, notify processor) | M4 | agent-ui | planned | feat/M4/notifications | Swap in-memory seed → DB (worker persist + API read); contract unchanged |
| M4-002 Import shared schemas (upload, mapping, validation, preview, envelopes) | M4 | agent-amni-01 | done | feat/M4/imports-notifications | `schemas/import.ts` extended + `import-engine.ts` (templates, mapping, validation); PR #52 |
| M4-003 Import API module (`/api/v1/imports/*`: create/upload/mapping/validate/execute/summary/error-rows/rollback + templates) | M4 | agent-amni-01 | done | feat/M4/imports-notifications | Zod-validated, audited; CSV/XLSX parsing; PR #52 |
| M4-004 Worker imports processor (parse/validate/batch/progress/summary/error rows) | M4 | agent-amni-01 | done | feat/M4/imports-notifications | `apps/worker/src/jobs/imports.processor.ts` implemented; enqueues NOTIFY jobs → M4-001; PR #52 |
| M4-005 ERPNext import integration + tenant isolation tests | M4 | agent-ui | planned | — | kind→doctype mapping, `packages/erp` methods (feeds M4-004), two-tenant suite |
| M4-006 Import web UX (6-stage wizard + templates) | M4 | agent-ui | planned | feat/M4/imports-ui | Per PRODUCT_SPEC §5; depends on M4-002/M4-003 contract |

---

## CRM — Deals & Engagement (epic — claimable)

> Goal: close the gap vs Frappe CRM. Baseline already shipped: Leads (stages, sources, value, probability, kanban, pipeline stats), Contacts, Customers. Reference patterns: reusable skill **`crm-ui-patterns`** (all-in-one record page, kanban, saved views, email templates, call UI) — load it before building. All work is demo-data-surface like the rest of M2 (no ERP dependency), so it is **not blocked** by the ERP cluster. Branch prefix `feat/crm/`.

| Task | Milestone | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| CRM-000 Deals/Opportunities entity (schema + API + kanban/table UI, mirrors leads) | CRM | agent-crm | done | feat/crm/deals | Schema+API+kanban/table+detail; PR #50 |
| CRM-001 Comments & threaded discussions on records | CRM | agent-crm | planned | feat/crm/comments | Activity timeline extension |
| CRM-002 Tasks / checklists on records | CRM | agent-crm | planned | feat/crm/tasks | — |
| CRM-003 Saved custom views (named view presets) | CRM | agent-crm | planned | feat/crm/saved-views | Filters/sort/columns → preset |
| CRM-004 Outreach email templates (placeholders + send via worker `mail`) | CRM | agent-crm | planned | feat/crm/email-templates | Distinct from finance `sign` templates |
| CRM-005 Call UI + call logs (Twilio/Exotel) | CRM | agent-crm | planned | feat/crm/calls | Settings → Integrations |
| CRM-006 WhatsApp surface | CRM | agent-crm | planned | feat/crm/whatsapp | — |

---

## M5 — HRMS embed (backlog)

> Goal: Frappe HR (`hrms` app) installed per tenant + embedded in an Amni "HRMS" section via the `amni_bridge` SSO/theme app. Full feature set ships as the real Frappe HR desk; People (Contacts) lives inside HRMS.

| Task | Milestone | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| M5-000 HRMS embed: hrms app install, amni_bridge SSO, /hrms UI | M5 | agent-platform | in-progress | feat/M5/hrms-embed | PR #53; desk iframe + SSO JWT + theme; ops: db:migrate + install-hrms.ps1 + HRMS_SSO_SECRET |

---

## Change log of the board itself

| Date | Change |
|---|---|
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
