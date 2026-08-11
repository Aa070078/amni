---
name: testing-isolation
summary: Practical test guidance for unit, integration, ERPNext integration, and tenant-isolation suites in this repo.
---

# Testing & Isolation (repo skill)

Purpose: help agents understand the repo's testing expectations and the importance of tenant isolation.

When to use
- When writing tests for new features, especially ERP-backed endpoints.
- When validating changes to authorization and tenant-scoping logic.

Do
- Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` for logic changes.
- Run `pnpm test:isolation` for every ERP data path.
- Use `supertest` + Testcontainers for API integration tests.
- Add tenant isolation tests that create two tenants and verify cross-tenant access 403/404s.
- Keep tests co-located with code in `*.spec.ts`.

Don't
- Assume isolation is covered by unit tests alone.
- Skip the isolation suite for ERP or tenant-scoped routes.

Quick pointers
- Root test scripts: `pnpm test`, `pnpm test:isolation`, `pnpm test:e2e`
- Coverage: `apps/api`, `packages/erp`, `packages/db`, `apps/web` pages and hooks.
- Docs: `TESTING.md` and `AGENTS.md`.
