# Contributing to Amni

Thanks for contributing. Please read `AGENTS.md` first — it is the operational contract for everyone working in this repo (humans and AI agents).

## 1. Environment setup

1. Clone the repo and install: `pnpm install` (pnpm ≥ 9).
2. Copy `infra/docker/.env.example` → `.env` and `infra/erp/.env.example` → `.env`; fill in dev values.
3. Start platform deps: `docker compose -f infra/docker/compose.yaml up -d`.
4. Provision/migrate the platform DB: `pnpm db:migrate`.
5. Start the ERP cluster (frappe_docker): see `DEVELOPMENT.md §ERP cluster` — requires the full override set (mariadb + redis + noproxy) and `PULL_POLICY=missing`.
6. Run `pnpm dev` (web, api, worker). See `DEVELOPMENT.md`.

## 2. Branch naming

- Integration branch: `dev`. Releases: `main`. Never push directly to `main`.
- Branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`, `test/<slug>`.
- Optional milestone prefix: `M2/provisioning-state-machine`.

## 3. Commit conventions

- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`.
- One logical change per commit. Keep commits small and reviewable.
- Never commit secrets, `.env` files, local DB dumps, or build output.

## 4. Pull requests

- Open against `dev`. Description references the issue (`Closes #123`) and summarizes the change + any design decisions.
- PR checklist must confirm: design system used, page contract implemented, server-side authorization, tenant isolation tested (if ERP), tests added/passing, docs updated.
- Squash-merge. Keep PRs small; split large work.

## 5. Code review

- Reviewer checks: correctness, security (authz, tenant isolation, secrets), design-system compliance, API contract compliance, tests, docs, no dead code, no unnecessary dependencies.
- Tenant-isolation regressions are release-blocking.
- Fix findings in new commits; request re-review.

## 6. Testing

- `pnpm test` runs unit + integration.
- E2E: `pnpm test:e2e` (Playwright) — critical journey must pass.
- Tenant isolation tests are required for every ERP data path.
- See `TESTING.md` for the full strategy.

## 7. Design system usage

- Use `packages/ui` components; never hand-roll equivalents in pages.
- Follow tokens; propose token changes through the design-system package, not inline.
- Follow the page contract (loading/empty/error/validation/success/permissions/responsive/a11y).

## 8. Adding pages / APIs / ERPNext integrations

Follow the numbered recipes in `AGENTS.md §14–16`. In short: typed contract in `packages/shared` → NestJS endpoint → `packages/erp` client (if ERP) → page using `packages/ui` → tests → docs.

## 9. Documentation requirements

- Update the affected doc(s) in the same PR.
- Architecturally significant decisions → `docs/adr/NNNN-title.md`.
- Update `CHANGELOG.md` when merging to `dev`.

## 10. Code of conduct

- Be constructive and specific in reviews.
- Assume good intent; discuss design in the PR, not in DMs.
- No destructive broad refactors without an issue + discussion.
