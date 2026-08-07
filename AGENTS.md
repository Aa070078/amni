# AGENTS.md — Operational Instructions (developers & AI agents)

This is a living operational document. Read it before doing anything in this repo. It exists so any developer or AI agent can continue the project without the original author's memory.

---

## 0. Multi-agent coordination (MANDATORY — read before ANY work)

This repo is worked by multiple agents concurrently. Before starting any session, **every** agent must:

1. **Sync to latest**: run `pnpm agent:sync` (fetches, checks out `dev`, `pull --rebase`, prints changelog + workboard). Always start from the latest `dev`. Never work from stale code.
2. **Read the changelog** (`CHANGELOG.md` → `[Unreleased]`) to see what already landed.
3. **Check the workboard** (`docs/coordination/WORKBOARD.md`) — the registry of who works on what.
4. **Claim a task before building**: set `Owner` + `Status: in-progress` + `Branch` on your row and commit the claim *first*. One agent per task. Never claim/start a task that is `in-progress` by another agent.
5. **Never overwrite others**: pull `dev` before every push; work on branches (`feat/<milestone>/<slug>`); never push to `dev`/`main` directly; never force-push or rewrite shared history; keep `packages/ui`, `packages/shared`, the workboard, and `CHANGELOG.md` additive.
6. **Close the loop**: on completion, push branch → PR to `dev` (squash) → mark your board row `done` with PR link → append to `CHANGELOG.md` `[Unreleased]`. Output a session report (see protocol §8).

Full protocol, claim format, turf map, and session-report template: **`docs/coordination/README.md`**. Task ownership: **`docs/coordination/WORKBOARD.md`**. Design language for all UI work: **`docs/design/DESIGN.md`**.

---

## 1. Project purpose

**Amni** is a multi-tenant ERP SaaS platform. Any business signs up, answers a few simple questions, and gets a complete, provisioned ERP (built on ERPNext/Frappe) — while using Amni's own premium frontend as the product. See `PRODUCT_SPEC.md` and `ARCHITECTURE.md`.

## 2. Architecture summary (30 seconds)

- **Two stores, never mixed.** Platform DB (Postgres) = users/companies/tenants/plans/jobs/audit. ERPNext (per-tenant MariaDB site) = business data.
- **Frontend never talks to ERPNext.** `apps/web → apps/api (NestJS) → packages/erp → tenant ERPNext site (per-tenant service account)`.
- **Tenant isolation is server-side only.** Tenant is resolved from the authenticated session + Membership. Never trust client-supplied tenant ids for data access.
- **Provisioning** is an async, idempotent state machine executed by `apps/worker` (BullMQ) driving the bench CLI (docker exec) on the frappe_docker cluster.
- **No ERPNext core modifications.** Use configuration, REST, roles, custom fields/workflows, webhooks. Anything else needs an ADR.

## 3. Repository structure

See `ARCHITECTURE.md §3`. Key facts:
- pnpm workspace + Turborepo. `apps/*` are runnable; `packages/*` are shared libraries; `infra/*` is deployment; `docs/` is design + runbooks + ADRs.
- `packages/shared` = single source of truth for API contract (Zod schemas + types). Both `apps/web` and `apps/api` import from it. **Never redefine contract types in an app.**
- `packages/ui` = the design system. **Never build a bespoke UI component in a page if `packages/ui` has one.**

## 4. Coding rules

- TypeScript strict, no `any` (except documented boundary casts).
- Follow existing patterns before writing new ones. Read the neighboring code first.
- No comments unless they explain *why* (not what). No dead code. No unused imports (eslint enforced).
- Small, focused, reviewable changes. One logical change per commit/PR.
- No new dependencies without justification (add to PR description). Prefer the monorepo's existing libs (Next.js, NestJS, Prisma, zod, TanStack, shadcn, Tailwind, BullMQ, pino).
- Never commit secrets, `.env*` (except `.env.example`), keys, or credentials.

### Naming conventions
- Files: `kebab-case` for components/pages/files. Classes/interfaces: `PascalCase`. Functions/variables: `camelCase`. Constants: `UPPER_SNAKE_CASE`. Prisma models: `PascalCase`. DB tables: camelCase as generated.
- API modules: `XModule`, controllers `XController`, DTOs in `packages/shared` (`x.dto.ts`) with zod schemas.
- ERPNext doctypes map to domain types in `packages/erp` (e.g., `Item`, `SalesOrder`, `Customer`).

## 5. Design rules

- **Use `packages/ui` for everything**: buttons, inputs, selects, tables, cards, badges, tabs, modals, drawers, toasts, alerts, tooltips, breadcrumbs, pagination, filters, search, charts, empty/loading/error states, navigation. No duplicated UI implementations.
- Follow the design tokens (colors, typography, spacing, radius, shadows) in `packages/ui`. Don't invent new values. Extend tokens only via the design-system package.
- Pages must implement the **page contract**: loading / empty / error / validation / success / permissions / responsive / a11y / API wiring. A visual-only page is not done.
- Accessibility is non-negotiable: labels on all inputs, `aria-describedby` error wiring, focus-visible states, keyboard operability, `prefers-reduced-motion`, semantic HTML. No placeholder-only labels.
- Data-heavy pages use the shared data-table core (sorting, filtering, column visibility, density, selection + bulk actions, sticky header, skeleton, distinct empty/no-results states).
- Dark mode is baseline (light default + dark, token-driven).

## 6. API rules

- All endpoints live in `apps/api` behind `/api/v1/...`. Responses follow the shared envelope: `{ data }` or `{ error: { code, message, details, requestId } }`.
- Pagination/filtering/sorting/search follow the shared conventions in `packages/shared`. No ad-hoc per-page shapes.
- Validation is zod (shared schemas) on the server. Never trust the client.
- Every sensitive/mutating action writes an AuditLog entry.
- Long operations are enqueued (BullMQ), never run synchronously in a request.

## 7. ERPNext integration rules

- All ERPNext access is through `packages/erp` (typed client). **No page/controller calls ERPNext directly.**
- The client authenticates with the tenant's service account (`Authorization: token api_key:api_secret`). Keys are read from the encrypted `ERPInstance` record — never from client input or env for tenant data.
- Use the official REST API (`/api/v1`): `resource` CRUD, `/api/method` for whitelisted methods, doc methods for submit/cancel. Do NOT call internal/private methods or raw SQL.
- Map ERPNext errors to platform error codes. Preserve the ERPNext `__frappe_exc_id` in logs.
- Use official extension mechanisms (Configuration, Custom Field, Property Setter, Workflow, Roles, Webhooks). If a core modification seems required → write an ADR in `docs/adr/` documenting why supported mechanisms are insufficient before proceeding.
- Never modify files in the frappe_docker bench apps directly. If a tiny custom app is ever needed, it lives in `infra/erp/apps/` as a separate app installed per-site — with justification.

## 8. Tenant isolation rules (critical)

- **Never** resolve tenant data by a client-supplied tenant id alone. Derive the tenant from the authenticated user's `Membership` (server-side). Validate membership + role for every scoped operation.
- `packages/erp` must reject any call whose target site/keys don't match the resolved tenant.
- Cross-tenant tests are mandatory for any ERP data path (see TESTING.md). A regression that leaks tenant data is a release-blocking bug.
- Don't copy tenant business data into the platform DB. If caching is ever added, it must be clearly tenant-scoped and derived, never a store of record.

## 9. Security rules

Follow `SECURITY.md`. Golden rules: server-side authorization everywhere; argon2id for passwords; httpOnly cookies + CSRF double-submit; throttle auth endpoints; validate and limit uploads; never log secrets/PII; never commit secrets; allow-list external URLs (SSRF).

## 10. Testing rules

- Unit tests for business logic (Vitest/Jest) alongside code (`*.spec.ts`).
- Integration tests hit real Postgres + a real (or Testcontainers) ERPNext site.
- **Tenant isolation tests** are mandatory for ERP data paths (two tenants, cross-access must 403/404).
- E2E (Playwright) covers the critical journey: signup → wizard → provision → dashboard → customer → product → order → invoice → payment.
- `pnpm test` at repo root runs everything. CI runs lint + typecheck + unit on every PR; integration + e2e on merge to `dev`; security scan on merge to `main`.
- Fix a failing test before merging; don't delete tests to make CI green.

## 11. Git workflow

- Default integration branch: `dev`. Releases from `main`. **Never commit directly to `main`.**
- Branch naming: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`, `test/<slug>`. Prefix with milestone if useful (`M2/provisioning-state-machine`).
- Commit messages: Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`).
- Open a PR to `dev`; PR description references the issue and lists what changed; request review. Merge via squash.
- Keep PRs small. Never overwrite another's work: pull `dev` before branching, resolve conflicts carefully.
- **Multi-agent:** follow §0 + `docs/coordination/README.md` — claim tasks on the workboard before starting, pull latest (`pnpm agent:sync`) before every session/push, and update board + changelog when done.

## 12. Documentation rules

- Update the relevant doc with every behavior change: `PRODUCT_SPEC.md` (product), `ARCHITECTURE.md` (structure), `AGENTS.md` (this file, ops), `DEVELOPMENT.md` (setup), `DEPLOYMENT.md` (ops), `SECURITY.md` (security), `TESTING.md` (tests).
- UI/visual work: follow and keep current `docs/design/DESIGN.md` (design language). Multi-agent work: follow `docs/coordination/README.md` + `WORKBOARD.md`.
- Architecturally significant decisions → `docs/adr/NNNN-title.md` (ADR format: Context / Decision / Consequences).
- Update `CHANGELOG.md` on merge to `dev`.

## 13. What must not be modified

- ERPNext/Frappe core (bench apps in the ERP cluster).
- `packages/shared` contract types without updating both apps + docs.
- The design-token set without a design-system review.
- `dev`/`main` branch protection rules.
- Platform DB schema without a Prisma migration committed alongside.

## 14. How to add a page

1. Find the module in `apps/web`; create `app/(app)/<module>/<page>/page.tsx` following an existing page.
2. Build the UI from `packages/ui` components + tokens.
3. Add a typed API method in `apps/web/lib/api.ts` (or the module's api client) using the shared contract.
4. Implement the endpoint in the matching NestJS module controller + service (zod-validate, audit where needed).
5. If it touches ERP data: add the `packages/erp` method + controller route in `ErpGatewayModule`.
6. Implement the full page contract (loading/empty/error/validation/success/permissions/responsive/a11y).
7. Add unit tests (page logic) and integration/isolation tests if ERP-backed.
8. Update docs (page inventory) if new area; open PR to `dev`.

## 15. How to add a backend module

1. `packages/shared`: add zod schemas + types for the domain.
2. `apps/api/src/<name>/`: module, controller, service, guard/decorator usage; register in `AppModule`.
3. Wire persistence through `packages/db` (Prisma client + migration if schema changes).
4. Add AuditLog calls for mutating/sensitive actions.
5. Tests: service unit tests + supertest integration.

## 16. How to add an ERPNext integration

1. Research the official ERPNext REST API / DocType (check the running bench source if unsure — do not guess).
2. Add typed DTOs + client method in `packages/erp`.
3. Expose via `ErpGatewayModule` with tenant resolution + audit.
4. Add isolation tests (two tenants) + integration test against a real site.
5. Document the mapping (product term → doctype) in the module docs.

## 17. How to run the project

See `DEVELOPMENT.md`. Quick start:
```
pnpm install
pnpm db:migrate && pnpm db:seed
docker compose -f infra/docker/compose.yaml up -d   # postgres, redis
pnpm dev                                             # web + api + worker
```
The ERP cluster runs via `infra/erp` (frappe_docker overrides; see DEVELOPMENT.md for exact commands including the required compose overrides and `PULL_POLICY=missing`).

## 18. How to update documentation

Edit the doc, keep it current with the change, and reference it in the PR. Never write a separate "doc update" commit without the behavior change; keep them together. Update `CHANGELOG.md` on merge.

## 19. Definition of done (summary)

UI exists using the design system · API works (typed, zod-validated) · backend logic correct · ERPNext integration works where applicable · validation · loading/empty/error/success states · permissions enforced server-side · tenant isolation preserved (tested) · responsive · accessible · tests exist · docs updated · no obvious runtime errors · existing functionality intact. See `PRODUCT_SPEC.md §6.3` and the repo-wide DoD list.
