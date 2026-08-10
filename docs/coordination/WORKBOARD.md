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
| **M3-000 Provisioning state machine** (site create → configure → ERP ready; idempotent, retries, progress events) | M3 | agent-m3-provisioning | in-progress | feat/M3/provisioning | `apps/worker/src/jobs/provisioning.processor.ts` stub exists |
| M3-001 `packages/erp` client v1 (login, resource CRUD, tenant service-account) | M3 | agent-m3-erp | in-progress | feat/M3/erp-gateway | Typed client + isolation tests |
| M3-002 `ErpGatewayModule` (tenant-scoped proxy endpoints + audit) | M3 | agent-m3-erp | in-progress | feat/M3/erp-gateway | — |
| M3-003 Company creation + plan selection API | M3 | agent-m3-provisioning | in-progress | feat/M3/provisioning | Platform DB (Prisma) |
| M3-004 ERP status surfacing (wizard progress → dashboard) | M3 | agent-m3-provisioning | in-progress | feat/M3/provisioning | Depends on M3-000 events |
| M3-005 Tenant isolation test suite (two tenants, cross-access 403/404) | M3 | agent-m3-erp | in-progress | feat/M3/erp-gateway | Mandatory before any ERP data path ships (TESTING.md) |
| M3-006 Wizard completion → enqueue provision job | M3 | agent-m3-provisioning | in-progress | feat/M3/provisioning | Wires M2-000 to M3-000 |
| M3-007 Onboarding email (verify/reset/welcome) via worker `mail` | M3 | agent-m3-erp | in-progress | feat/M3/onboarding-mail | `apps/worker/src/jobs/mail.processor.ts` stub exists |

---

## M4 — Data Import + Notifications (backlog)

| Task | Milestone | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| M4-000 Data import pipeline (6-stage UX, CSV/XLSX, batch, rollback) | M4 | — | planned | — | See PRODUCT_SPEC §5; worker `imports` stub exists |
| M4-001 In-app notifications persistence (`Notification` model) | M4 | — | planned | — | — |

---

## Change log of the board itself

| Date | Change |
|---|---|
| 2026-08-10 | M3 claimed: M3-000/M3-003/M3-006/M3-004 → agent-m3-provisioning (feat/M3/provisioning); M3-001/M3-002/M3-005 → agent-m3-erp (feat/M3/erp-gateway); M3-007 → agent-m3-erp (feat/M3/onboarding-mail). |
| 2026-08-10 | M2-025 People: Contacts marked done; PR #30 (agent-amni-01). Supersedes the earlier PR #26 (closed) after PR #25 merged the Purchasing + finance epic into `dev`. |
| 2026-08-09 | M2-000, M2-001, M2-009..M2-018 marked done, plus new finance workspaces M2-019..M2-024 (invoicing, accounting, sign, equity, esg, expense claims/categories) — all on `feat/M2/sales-inventory`, delivered via PR #25. Epic is code-complete; merge to `dev` is the remaining gate. |
| 2026-08-09 | M2-003..M2-008 (quotations, sales orders, sales invoices, products, warehouses, stock movements) marked done; PR #25 open (agent-sales-inventory), stacked on PR #24. |
| 2026-08-08 | M2-002 Leads marked done; PR #24 open (agent-ui). |
| 2026-08-08 | Bugfix to M1-002 (dashboard): chart-grid overflow fixed so Receivables aging no longer overlaps Quick Actions/Alerts; cash chart converted to sparkline variant. Committed `035d82f` on `dev`. |
| 2026-08-07 | Board created: M1 marked done; M2/M3/M4 planned tasks registered. |
