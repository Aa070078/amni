# Changelog

All notable changes to Amni are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/) and the repo uses [Conventional Commits](https://www.conventionalcommits.org/). Unreleased work lands on `dev` and is promoted here on merge.

## [Unreleased]

### Added (dev)
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
