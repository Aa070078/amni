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
| **M2-000 Setup Wizard** (onboarding epic: company→regional→business→team→import→provision) | M2 | — | planned | — | Reuses auth; draft auto-save; see PRODUCT_SPEC §4 |
| M2-001 Customers list + detail | M2 | — | planned | — | Sales module; uses DataTable core |
| M2-002 Leads / Opportunities (pipeline) | M2 | — | planned | — | Sales |
| M2-003 Quotations | M2 | — | planned | — | Sales |
| M2-004 Sales Orders | M2 | — | planned | — | Sales |
| M2-005 Sales Invoices + record payment | M2 | — | planned | — | Sales/Finance cross-cut |
| M2-006 Products list + detail | M2 | — | planned | — | Inventory |
| M2-007 Warehouses + Inventory stock levels | M2 | — | planned | — | Inventory; low-stock alerts |
| M2-008 Stock Movements | M2 | — | planned | — | Inventory |
| M2-009 Suppliers | M2 | agent-amni-01 | in-progress | feat/M2/purchasing-people | Purchasing; mirrors customers pattern |
| M2-010 Purchase Orders | M2 | agent-amni-01 | in-progress | feat/M2/purchasing-people | Purchasing |
| M2-011 Purchase Invoices | M2 | agent-amni-01 | in-progress | feat/M2/purchasing-people | Purchasing |
| M2-019 People: Contacts list + detail | M2 | agent-amni-01 | in-progress | feat/M2/purchasing-people | People module (nav); new task |
| M2-012 Financial Overview + Reports | M2 | — | planned | — | Finance; revenue/AR/AP/cash KPIs |
| M2-013 Expenses + Payments | M2 | — | planned | — | Finance |
| M2-014 Settings: Company / Team & roles | M2 | — | planned | — | Self-serve admin |
| M2-015 Settings: Plan & billing / Integrations / Profile | M2 | — | planned | — | — |
| M2-016 Command palette (Cmd/Ctrl-K) | M2 | — | planned | — | `packages/ui` Command primitives ready |
| M2-017 Global search (top bar) | M2 | — | planned | — | Depends on command palette patterns |
| M2-018 Notifications center (top bar) | M2 | — | planned | — | Worker `notify` job exists; UI only |

---

## M1 — Foundation (DONE — reference only)

| Task | Milestone | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| M1-000 Monorepo scaffold + CI + design system | M1 | platform | done | — | See CHANGELOG |
| M1-001 Auth (register/login/session/refresh/CSRF/lockout) | M1 | platform | done | — | See CHANGELOG |
| M1-002 Dashboard (hero 3D, animated KPIs, charts) | M1 | platform | done | — | `apps/web/app/(app)/dashboard`; see DESIGN.md §4 |

---

## M3 — Tenant + Provisioning (epic — next after M2)

> Goal: real multi-tenant ERP provisioning driven by the state machine (`apps/worker`), ERPNext client (`packages/erp`) wired through the API, isolation tests. See `ARCHITECTURE.md` + `DISCOVERY_REPORT.md`.

| Task | Milestone | Owner | Status | Branch | Notes |
|---|---|---|---|---|---|
| **M3-000 Provisioning state machine** (site create → configure → ERP ready; idempotent, retries, progress events) | M3 | — | planned | — | `apps/worker/src/jobs/provisioning.processor.ts` stub exists |
| M3-001 `packages/erp` client v1 (login, resource CRUD, tenant service-account) | M3 | — | planned | — | Typed client + isolation tests |
| M3-002 `ErpGatewayModule` (tenant-scoped proxy endpoints + audit) | M3 | — | planned | — | — |
| M3-003 Company creation + plan selection API | M3 | — | planned | — | Platform DB (Prisma) |
| M3-004 ERP status surfacing (wizard progress → dashboard) | M3 | — | planned | — | Depends on M3-000 events |
| M3-005 Tenant isolation test suite (two tenants, cross-access 403/404) | M3 | — | planned | — | Mandatory before any ERP data path ships (TESTING.md) |
| M3-006 Wizard completion → enqueue provision job | M3 | — | planned | — | Wires M2-000 to M3-000 |
| M3-007 Onboarding email (verify/reset/welcome) via worker `mail` | M3 | — | planned | — | `apps/worker/src/jobs/mail.processor.ts` stub exists |

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
| 2026-08-08 | Bugfix to M1-002 (dashboard): chart-grid overflow fixed so Receivables aging no longer overlaps Quick Actions/Alerts; cash chart converted to sparkline variant. Committed `035d82f` on `dev`. |
| 2026-08-07 | Board created: M1 marked done; M2/M3/M4 planned tasks registered. |
