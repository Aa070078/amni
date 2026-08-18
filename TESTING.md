# Testing — Amni

Testing strategy, tools, and the required test matrix. A beautiful UI with broken business logic is not acceptable.

---

## 1. Strategy overview

| Layer | Tool | Scope | Runs |
|---|---|---|---|
| Unit | Vitest (packages) / Jest (apps) | pure logic: zod schemas, state machine, services, guards, DTO mapping, encryption | every PR |
| Integration (API) | supertest + Testcontainers (Postgres, Redis) | controllers + services + Prisma + BullMQ wiring | every PR + merge to `dev` |
| ERPNext integration | supertest against a real ERPNext site (frappe_docker) | `packages/erp` client, gateway endpoints, provisioning steps against real bench | merge to `dev` + nightly |
| Tenant isolation | dedicated suite (`test:isolation`) | cross-tenant access must 403/404 on every ERP data path | merge to `dev` + nightly |
| E2E | Playwright | critical user journey in a full local stack | merge to `dev` + nightly |
| Security | unit + integration + static | authz, CSRF, rate-limit, uploads, injection, secret handling | every PR (static), nightly (deep) |
| Performance | k6 (optional) | list/detail endpoints under load; provisioning concurrency | pre-release |

## 2. Unit testing

- Co-locate `*.spec.ts` with code.
- Cover: state-machine transitions (provisioning), idempotency logic, zod schemas (edge cases), tenant-scope resolution, token logic, encryption/decryption round-trip, ERP DTO mapping, error mapping.

## 3. Integration testing

- Testcontainers boots Postgres + Redis; run migrations; seed.
- API tests use `supertest` against the NestJS app; auth helpers create real sessions.
- Assert: status codes, envelope shape, zod rejection, authorization (401/403), audit rows written.

## 4. ERPNext integration testing

- Requires a running frappe_docker bench with a **test site per test tenant** (`<x>.localhost`).
- Coverage: `packages/erp` CRUD + submit/cancel, company setup (create Company, defaults), service-account creation + key auth, tenant-admin creation + role bundle, data import template/preview/import, reports, webhook receipt.
- Provisioning steps are integration-tested end-to-end against the real bench (idempotency: re-running a step must not duplicate).
- **In-repo stand-in (always runs, no bench needed):** the tenant isolation harness in `apps/api/src/erp-gateway/mock-frappe-server.ts` simulates a tenant site (service-account auth + a doctype-scoped doc store, `?action=submit|cancel` transitions) and is exercised by every `*.isolation.spec.ts` suite. Run it with `pnpm test:isolation`. The supertest tier against a real bench lands under M5-007 when the cluster is reachable.

## 5. Tenant isolation tests (mandatory)

For **every** ERP data path and tenant-scoped API:
1. Create tenant A and tenant B (each a real ERP site in test).
2. As a user of A, attempt to read/create/update/delete B's resources by any id/URL.
3. Assert: 403 or 404; no data from B in the response; platform does not leak B's keys.
4. Also verify: A's calls carry A's service account only; B's site is unreachable with A's credentials.

Isolation regressions are release-blocking.

CRM persistence adds a dedicated two-site repository isolation suite that exercises the real HTTP client, custom list method, per-site service credentials, and cross-tenant 404 behavior. A real-bench release check must also migrate the Amni Bridge DocType, create/list a record through Frappe REST, restart the backend, and verify the payload remains unchanged.

## 6. Critical workflows (E2E)

The core proof the platform works (Playwright):

```
Landing → Sign Up → Verify → Create Company → Setup Wizard → Provision ERP
→ ERP Ready → Dashboard → Create Customer → Create Product → Create Sales Order
→ Create Invoice → Record Payment → View Dashboard reflects the business
```

Also covered: password reset, onboarding resume (draft), import flow (template→map→validate→import→summary), settings (team invite + role change), global search, empty/loading/error states on key pages, dark mode toggle.

## 7. Frontend testing

- Component tests for design-system components and complex widgets (data table, import wizard, drawer forms).
- Page-level: render + data hooks (MSW) covering loading/empty/error/success/permission states.
- a11y: axe assertions in component + e2e tests; keyboard and reduced-motion checks.

## 8. CI testing

- **Every PR**: lint, typecheck, unit, tenant isolation suite (`pnpm test:isolation`), static security, `pnpm audit`.
- **Merge to `dev`**: + API integration, ERPNext integration, e2e.
- **Merge to `main` (release)**: everything + secret scan + dependency scan.
- Nightly: full ERPNext integration + isolation + e2e against a fresh provisioned stack.

## 9. Running tests

```bash
pnpm test              # unit + integration (local Postgres/Redis via Testcontainers)
pnpm test:isolation    # tenant isolation suite
pnpm test:e2e          # Playwright (needs full stack: platform + ERP cluster + seed)
pnpm audit             # dependency audit
pnpm lint              # eslint (+ security plugin)
```

## 10. Test data & fixtures

- Platform seed: plans, admin user, sample company (no tenant business data).
- ERP fixtures per tenant: minimal company, sample customer/item needed by e2e.
- Never use production data; never commit real credentials.

## 11. Definition of done (testing portion)

Every feature ships with: unit tests for its logic; integration tests for its endpoints; isolation tests if it touches ERP/tenant data; e2e coverage if it's in the critical journey or a core page; docs updated; tests green locally and in CI.
