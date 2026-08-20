# Staged pilot release gate

Production-like pilot evidence is required before accepting paying customers. Run this against staging with the same image digests and topology intended for production.

## Entry criteria

- All CI checks and the clean-site real ERP gate pass on the release commit.
- Production preflight passes with no template/default secret values.
- DNS and trusted TLS are active; Postgres and Redis have no public ports.
- External log retention, paging, SMTP, encrypted object storage, and named on-call ownership are configured.
- Platform and at least one tenant ERP backup have passed disposable restore drills.

## Pilot cohort

Start with one internal tenant for 48 hours, then up to five invited design partners for seven days. Do not enable self-service public signup or billing during the pilot. Use a documented support channel and maintenance window.

## Required journeys

- signup, verification, setup, real provisioning, dashboard
- invite admin/member/sales/accountant/inventory roles and verify both permitted and denied routes
- customer, item, quotation, sales order, submitted invoice, allocated payment
- supplier, purchase order, submitted purchase invoice, payment
- CRM, accounting, recurring invoice, Equity, ESG, Sign workflow, imports, notifications, and HRMS SSO
- ERP backend restart, platform API restart, worker restart, and queue recovery
- backup, disposable restore, previous-image rollback, tenant-token rotation, and incident paging exercise

## Volume and security evidence

- Seed a non-customer staging tenant with at least 10,000 customers, 10,000 items, 25,000 invoices, and 100,000 ledger rows using supported ERP import tools.
- Verify bounded list/search behavior at that volume. Run `pilot-load.ps1` against landing, liveness, and readiness with at least 1,000 requests at concurrency 25; require <1% errors and p95 <1.5 seconds from the selected region.
- Run `pnpm audit --audit-level high`, secret scanning, tenant isolation, CSRF/authorization negative tests, and an external penetration test focused on cross-tenant access, SSRF, session handling, uploads, and the ERP SSH boundary.
- Browser-test desktop/mobile, keyboard-only operation, reduced motion, error states, and slow/offline recovery.

## Exit criteria

- Seven consecutive days without Severity 1 incidents, unreconciled data loss, cross-tenant findings, failed backups, or unexplained provisioning failures.
- 99.9% successful external readiness probes during the final 72 hours, excluding an announced maintenance window.
- Every pilot issue has an owner and severity; no open P0/P1 item affects isolation, authentication, durability, backups, posting/accounting correctness, or recoverability.
- Product, engineering, operations, security, privacy/legal, and support owners sign the release record.

If any exit criterion fails, pause expansion, fix the issue, repeat the affected proof, and restart the required stable period for that criterion.
