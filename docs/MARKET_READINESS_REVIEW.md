# Market-readiness review — 2026-08-18

## Executive assessment

Amni's control plane, application shell, onboarding flow, and ERP-backed modules now run coherently against both the development fixture and a real pinned ERPNext v16 bench, but the product is **not ready for production launch yet**. M9 closes the three P0 blockers identified in the first review: provisioning now creates usable encrypted ERP credentials and roles, the owner/admin/member authorization baseline is enforced server-side, and the repository can build and bootstrap a real reproducible ERP stack. Remaining release blockers are concentrated in demo-only domain stores, production-scale data access, operations, and automated release gates.

## Fixed in M9 product-readiness work

- Registration and onboarding drafts are persisted per user and can no longer attach a new signup to the shared demo company. Company/profile settings now persist to the authenticated user's company and profile.
- The worker reliably loads its local database/Redis environment. Failed provisioning is visible and retryable, unfinished workspaces are redirected to setup, and the failed-job retry path is idempotent.
- The bench driver installs ERPNext, HRMS, and Amni Bridge; runs ERPNext's supported programmatic setup flow; creates a dedicated integration user; assigns eight operational roles; rotates API credentials; encrypts them at rest; and probes the authenticated user plus Company access before activation.
- Unsafe API methods now default to owner/admin authorization. Explicit member self-service exceptions are limited to onboarding, profile/password, and notification state; negative tests and a live 403 probe cover the boundary.
- CRM is a first-class `/crm` workspace instead of a Sales child. Legacy URLs redirect, Sales is a compact quote-to-cash launchpad, and the dashboard hierarchy/responsive grid no longer leaves an empty KPI column or collides with its decorative hero.
- The real browser journey now exercises signup, all six setup steps, customer and product creation, order and invoice creation, invoice submission, allocated payment, and the paid dashboard state. It also fixed duplicate product POSTs, encoded document identifiers on every detail route, setup-label accessibility, and invoice payments that were not allocated to their ERPNext invoice.
- `infra/erp/scripts/build-image.ps1` and `bootstrap.ps1` build a pinned image and reproducibly start MariaDB, Redis, Frappe, ERPNext, HRMS, and Amni Bridge. The bootstrap was exercised from image build through real HTTP ping, app installation, company configuration, token authentication, role verification, and REST Company access.

## Fixed in M8-000

- Dashboard roles now come from the authenticated user's server-side membership. A client query parameter can no longer promote a member to admin.
- Dashboard response fields are filtered by role. Members receive only their permitted revenue KPI/trend; they no longer receive cash, receivables, alerts, activity, or admin quick actions.
- The dashboard now uses one shared snapshot request instead of three independently retried panel requests. Tenant scope is resolved once and ERP reads are reduced from roughly 13 to 8 for a complete load.
- ERP connection failures are shown as a truthful workspace status and actionable error instead of a generic panel failure while the hero claims data is live.
- Sales invoice, sales order, and quotation list mapping tolerates ERP list responses without child-line arrays instead of crashing the whole section.
- API logging redacts response `Set-Cookie` headers, preventing access and refresh tokens from being written to logs.
- The dependency tree pins patched `deepmerge-ts` 8.x after CI detected the high-severity recursive-merge exhaustion advisory in Prisma's transitive configuration dependency.
- Root typechecking now serializes each package's build before its typecheck, and the database package no longer runs a second competing Prisma generation step. This removes `.next/types` races and Windows Prisma DLL rename failures when no runtime process holds the client.
- A development-only ERP stand-in with representative records is available through `pnpm --filter @amni/api demo:erp`. It is never a production substitute.
- The landing page now has a product-led hero, responsive dashboard preview, capability narrative, guided operating flow, and stronger conversion path using the shared design system.

## M10 progress

- CRM organizations, contacts, tasks, notes, activities, events, call logs, email templates, WhatsApp history, notifications, saved views, and CRM settings now persist in each tenant's ERP site through the supported Amni Bridge custom DocType. API contracts are unchanged; every request derives the site from authenticated membership.
- The CRM repository has two-tenant HTTP isolation coverage. The pinned real bench created and queried a CRM record through authenticated Frappe REST, then returned the identical JSON payload after the backend container restarted.
- Existing sites now run `bench migrate` during ERP image bootstrap, ensuring bundled DocTypes and patches match the immutable image. The development ERP fixture includes representative CRM records without seeding customer production sites.
- Accounting and invoicing now use native tenant ERP records: `Account`, `Journal Entry`, `GL Entry`, return `Sales Invoice`, and `Auto Repeat`. A bounded Amni Bridge query supplies account balances without copying ledger data into Postgres.
- The restricted provisioning account now includes ERPNext's Item, Sales Master, and Purchase Master manager roles in addition to the operational roles. A live token created master data and every finance fixture, survived a backend restart, read each record back, and removed the fixtures successfully.
- Sales Invoice Auto Repeat is enabled idempotently through Frappe's supported Property Setter mechanism on every site migration. The real-bench gate caught and verified this configuration rather than relying on the in-process mock.
- Equity, ESG, and Sign records now use a dedicated tenant-local `Amni Domain Record` DocType rather than API-process arrays. Namespaced keys prevent cross-domain collisions, all controllers route through membership-resolved ERP credentials, and mutations produce platform audit entries.
- A two-site HTTP isolation suite proves tenant A cannot list, retrieve, or mutate tenant B's records. The pinned real bench created all three domain types, queried through the bounded permission-checked method, restarted the backend, read every record back, and cleaned up.
- Settings no longer keeps team, role, plan, billing, or profile mutations in process memory. Membership product roles and status, invitations, and subscription billing periods are migrated in Postgres; expense categories are tenant-local ERP domain records. Unconfigured integrations are presented honestly and cannot be toggled into a fake connected state.
- Accountant, sales, inventory, member, and admin roles are derived from active membership on every request. The server denies cross-domain access, while the sidebar, command navigation, and settings navigation expose only permitted areas. Real runtime probes confirmed sales access and a finance 403.
- Team invitation links now contain expiring one-way tokens and flow through the mail queue to a dedicated acceptance page. Acceptance verifies or creates the account, creates the scoped membership, consumes the token, writes an audit record, and issues a session.

## Launch blockers

### Closed in M10-004 — settings and expense metadata durability

CRM, accounting, invoicing, Equity, ESG, signing workflow, settings, and expense categories are now durable and tenant-scoped. Signing still tracks internal workflow and audit state only; it must not be marketed as a legally binding external e-signature service until a qualified provider and evidence package are integrated.

### Closed in M10-004 — specialist business roles

Accountant, sales, inventory, member, and admin roles are persisted, enforced server-side by route domain, reflected by role-aware navigation, and covered by negative authorization tests.

### Closed in M10-005 — bounded ERP queries and tenant search

Shared ERP reads are capped, high-volume customer/supplier/item pages execute bounded queries in the tenant database, and global search is tenant- and role-scoped. Production-like volume remains a staged-pilot exit criterion.

### Closed in M10-005/M10-007 — control- and data-plane health

Liveness and dependency-aware readiness are separate, tenant ERP health is actively persisted, and the workspace and operator surfaces expose degraded/unreachable data planes.

### Closed in M10-006 — real-bench release gate

The main/nightly clean-site gate builds the pinned image, provisions restricted credentials, submits critical documents, verifies domain persistence across restart, and drops the isolated site.

### Closed in M10-007 — production operations contract

The production Compose topology, preflight, TLS proxy, SSH provisioning boundary, backup/restore drills, monitoring probes, incident/rollback runbooks, and staged-pilot release criteria are versioned with the product.

## Verification evidence

- `pnpm lint`: 8 workspaces passed.
- `pnpm typecheck`: 14 tasks passed after removing the build/typecheck races.
- `pnpm test`: 491 tests passed in the M10-004 gate (API 382, worker 27, ERP 70, shared 5, web 7).
- `pnpm test:isolation`: 84 tenant-isolation tests passed.
- Playwright: both critical journeys passed in Chromium: signup → six-step setup → provisioning and customer → product → order → invoice → submit → allocated payment → paid dashboard.
- `pnpm audit --audit-level high`: passed after the patched dependency override; one low-severity advisory remains below the enforced threshold.
- Production builds completed for API and web; the Next.js standalone trace warning remains recorded above.
- The pinned real ERP stack was built and bootstrapped in Docker at `:8080`. A clean `readiness.localhost` site installed ERPNext, HRMS, and Amni Bridge; its dedicated token authenticated as `amni-integration@readiness.local`, carried eight operational roles, and read its configured Company through REST.
- A fresh platform signup was driven through setup and provisioning. The worker consumed the job, the tenant reached `ACTIVE`, the company reached `READY`, and an encrypted healthy ERP instance was persisted. Postgres and Redis were healthy in Docker.
- Admin and member login both returned 201. Dashboard snapshot returned 200 in 76 ms and 20 ms respectively during the first runtime pass.
- Ten representative module endpoints returned 200 in 12–168 ms with the development fixture.
- Browser checks passed in light/dark themes at desktop and 390 px mobile widths across the landing page, dashboard, Sales, standalone CRM, and company settings. Admin received four KPIs and operational panels; member received only permitted data and unsafe member mutation returned 403.

## Release recommendation

The repository is an engineering release candidate. Do not accept unrestricted paying customers until the operator completes `docs/operations/STAGED_PILOT.md`, deploys the external production services, proves off-cluster restores, and closes an independent security/privacy review. Internal signing workflow must not be marketed as a legally binding e-signature provider.
