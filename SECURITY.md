# Security — Amni

Security is a first-class requirement. This document defines the threat model, controls, and operational guidance. It contains **no real secrets**.

---

## 1. Threat model (summary)

| Threat | Vectors | Controls |
|---|---|---|
| Cross-tenant access (the #1 risk) | client-supplied tenant id, guessed site URL, leaked keys, SSRF | server-side tenant resolution from Membership; per-tenant service accounts; site-DB isolation; allow-listed ERP base URLs; isolation tests |
| Broken access control | horizontal/vertical privilege escalation | server-side authz (guards + roles); field-level checks; no client trust |
| Authentication abuse | brute force, credential stuffing, session theft | argon2id, httpOnly cookies, refresh rotation, rate limits, lockout, throttling, MFA (future) |
| Injection | SQLi, NoSQLi, filter abuse | Prisma parameterization; zod-validate all input incl. ERP filters; ERP via JSON API only |
| XSS | stored/reflected input | React escaping; input validation; CSP; sanitization on the platform side; ERP guest methods guarded |
| CSRF | cross-site unsafe requests | SameSite cookies + CSRF double-submit on session-authenticated unsafe methods |
| SSRF | ERP integration URLs | ERP base URLs derived from validated `ERPInstance` records (cluster allow-list); no free-form URL fetch |
| File upload abuse | malware, oversized files, path traversal | type/size limits; server-side validation; storage outside web root; scan (future); safe filenames |
| Secrets leakage | commits, logs, error pages | no secrets in repo; pino redaction; encrypted tenant keys; error messages redact |
| API abuse / DoS | flooding, expensive queries | throttling, rate limits, pagination caps, per-tenant quotas |
| Sensitive data exposure | over-logging PII, verbose errors | audit/log redaction; minimal logging; traceback disclosure gated |

---

## 2. Authentication model

- **Platform**: email + password (`argon2id`, OWASP parameters). Sessions: two-token scheme — short-lived access session (httpOnly, SameSite=Lax cookie) + rotating refresh token (revocable). Password reset: rate-limited (3/hour), uniform responses (anti-enumeration), token single-use + expiry, invalidated on use.
- **Email verification**: single-use signed token; required before provisioning.
- **Account lockout**: per-user + per-IP failed-login throttling; escalating backoff; optional CAPTCHA above threshold.
- **MFA (future)**: TOTP via `otplib`; enforced for admin roles when enabled.
- **ERPNext tenant accounts (hybrid desk access)**: created during provisioning with the tenant's chosen/reset password; password policy enforced at creation; password resets go through the platform (rate-limited) and are synchronized to the tenant site.

## 3. Authorization model

- Platform membership roles are `Owner`, `Admin`, and `Member`, with persisted `sales`, `inventory`, and `accountant` product roles. Owner/Admin may mutate tenant business data; Member is read-only except for explicitly allow-listed self-service actions (profile, password, notifications). Product roles are enforced server-side by route domain and mirrored in navigation; negative cross-domain tests are release-blocking.
- The authentication guard derives membership, company, and product role from the server-side session on every protected request. Unsafe methods default to Owner/Admin-only; a handler must opt into Member mutation explicitly. ERP gateway calls independently resolve the company again from `Membership` and never accept a client tenant id.
- ERPNext side: the tenant's **service account** has the Accounts, Purchase, Sales, and Stock User/Manager roles required by Amni workflows — never Administrator or System Manager. Provisioning rotates API credentials, encrypts them with AES-GCM before persistence, and validates the token against the tenant REST API before activation.

## 4. Tenant isolation

1. **Data plane**: one ERPNext site (own MariaDB DB + DB user) per tenant — isolation at the database level (Frappe's model).
2. **Control plane**: tenant resolution is server-side. `packages/erp` loads the target site URL + decrypted keys **from the tenant's `ERPInstance` record**; a request for tenant A can never produce credentials for tenant B.
3. **Enforcement test**: `pnpm test:isolation` — two tenants; every cross-tenant read/create must 403/404. Release-blocking if failed.
4. **No tenant business data in the platform DB.** If derived caching is added later it must be explicitly tenant-scoped and never a store of record.

## 5. Secret handling

- Repo: no secrets. `.env*` gitignored; only `.env.example` committed.
- Dev: platform secrets from `.env`; tenant ERP keys encrypted at rest with `ENCRYPTION_KEY` (AES-256-GCM) before storage.
- Prod: secrets from the secret manager; `ENCRYPTION_KEY` never in repo; keys rotated per tenant on a schedule (job) and on suspected compromise; access to decrypted keys is limited to `packages/erp` and audited.
- CI: secrets injected via GitHub Actions secrets; never echoed.
- `HRMS_SSO_SECRET` (API) signs the HRMS SSO token; the bench copy (`amni_sso_secret` in `common_site_config.json`) validates it. They must match.
- The HRMS SSO token is short-lived (`HRMS_SSO_TOKEN_TTL_SECONDS`, default 120s), single-audience (the tenant site URL), single-use by design (`jti`), and only minted for active workspaces with `hrmsInstalled`.

## 6. API security

- Versioned `/api/v1`. Envelope `{ data } | { error }` with `requestId` in every response.
- Zod validation on every endpoint (shared schemas). Unknown fields rejected by default.
- Rate limiting: `@nestjs/throttler` + Redis sliding window; stricter on auth endpoints; per-tenant quotas on ERP-facing routes.
- CORS: only the platform web origin(s); credentials allowed only for the same-site cookie scope.
- Idempotency keys for creates that can be retried (provisioning, imports).

## 7. File upload security

- Allowed types/extensions allow-list; max size (e.g., 25 MB imports, 5 MB images); content sniffing; stored outside the web root; random names; served through an authenticated/download route with content-disposition; virus scanning (future).

## 8. Rate limiting & quotas

- Global + per-endpoint; auth endpoints 5/min/IP; search 30/min; ERP list endpoints 120/min/tenant; import 10/day/tenant.
- Lockout: 10 failed logins → 60s, escalating.

## 9. Audit logging

- `AuditLog` records: actor, action, resource, metadata, ip, `requestId`, at.
- Audited events: auth (login/logout/reset), membership & role changes, provisioning lifecycle, billing changes, key access, data import, destructive ERP operations.

## 10. Security testing

- Unit: authz guard logic, token logic, secret encryption.
- Integration: cross-tenant isolation, CSRF, rate-limit, upload validation, injection attempts via API.
- E2E: signup→provision flows; permission-based UI states.
- Static: eslint security plugin, `pnpm audit`, dependency scan (renovate/dependabot), secret scan (`gitleaks`) in CI.
- Dependency updates: PR-reviewed, no silent majors.

## 11. Incident response (principles)

1. **Contain**: revoke tenant service keys; suspend tenant/site; block the IP range.
2. **Assess**: pull audit log + request-id-correlated logs; determine blast radius (was isolation intact?).
3. **Communicate**: internal status page; affected customers notified per contract.
4. **Recover**: rotate keys, restore from backup if needed, re-validate with isolation tests.
5. **Postmortem**: ADR + issue; add regression tests; update this doc. The operational checklist and severity procedure live in `docs/operations/INCIDENT_RESPONSE.md`.
- Contact: security is handled via the repo owner (`Aa070078`). File issues tagged `security`.
