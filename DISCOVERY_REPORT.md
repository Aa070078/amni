# Amni — Discovery Report (Phase 0)

**Status:** Complete · **Date:** 2026-08-03 · **Author:** Platform engineering (AI-coordinated)

This report captures everything learned during Phase 0 (DISCOVERY) before any substantial implementation. It records findings, assumptions, architectural decisions, technical risks, and open questions. Every claim about ERPNext/Frappe was verified against the running runtime (ERPNext 16.30.0 / Frappe 16.29.0) or official documentation/source.

---

## 1. Environment as found

| Item | Detail |
|---|---|
| GitHub account | `Aa070078` (token scopes: gist, read:org, repo) |
| Platform repo | `https://github.com/Aa070078/amni` (private, created) |
| ERPNext runtime | Docker Compose (`F:\frappe_docker`), project `frappe`, image `frappe/erpnext:v16.30.0` |
| Frappe runtime | `16.29.0` (verified `frappe.__version__` in container venv) |
| ERPNext runtime | `16.30.0` |
| Databases | MariaDB `11.8.8` (shared, one DB per site) |
| Redis | `8.6-alpine` (cache + queue) |
| Bench | `bench 5.31.0` |
| Python | 3.14 (container venv at `/home/frappe/frappe-bench/env`) |
| Containers | `backend` (gunicorn :8000), `frontend` (nginx :8080), `websocket`, `queue-short`, `queue-long`, `scheduler`, `db`, `redis-cache`, `redis-queue` |
| Existing site | `localhost` (site_config: randomized `db_name` `_b7655d1f277fe701`, per-site `db_user`, apps `[frappe, erpnext]`) |
| ERPNext API | Verified live: `login` session auth, `/api/resource/*`, `/api/method/*`, `/api/method/frappe.auth.get_logged_user` |
| ERPNext MCP | `F:\mcp-servers\erpnext-mcp-server` (generic 14-tool REST wrapper; **not** used by the product — the product uses the official REST API directly) |
| ERPNext v17 source | Clones at `F:\erpnext`, `F:\frappe` (reference only; runtime is v16) |
| Design skills | 96 designer skills installed to `F:\.opencode\skills\designer-skills` |
| 21st.dev MCP | Available (shadcn/ui component registry; search/metadata/themes free, component-code retrieval metered) |

---

## 2. How ERPNext/Frappe actually works (source-verified)

### 2.1 Multi-tenancy model (the foundation of our architecture)
- A **site** = one MariaDB database + one folder `sites/<site-name>/site_config.json` + per-site `db_user`. Apps are installed **per site**; code is shared **per bench**.
- **DNS multitenancy**: site name *is* the hostname. Requests are routed by the `Host` header. In frappe_docker the frontend nginx template uses `server_name $host` + `X-Frappe-Site-Name` (verified by reading `/templates/nginx/frappe.conf.template` in the running container) — **the current stack already routes any hostname to a matching site without infra changes**.
- Site resolution precedence: `X-Frappe-Site-Name` header → `request.host` (port stripped). The `domains` key in `site_config.json` is **not** used for request routing in v16.
- **One scheduler + one RQ worker pool per bench** serves *all* sites. `bench schedule` loops every ~4 minutes and enqueues scheduled jobs for all sites. This is the main shared-infrastructure constraint.
- `site_config.json` holds `db_name`, `db_user`, `db_password`, `db_type`, `installed_apps`. Infra settings (db_host, redis) live in `sites/common_site_config.json`.

### 2.2 Site provisioning (`bench new-site`)
Pipeline (verified in `frappe/commands/site.py` → `frappe/installer._new_site`):
1. `frappe.init(site)` (validates site-name pattern)
2. DB name auto-generated `_<hash>` if not given; per-site `db_user` created
3. `make_site_dirs()` (files, backups, logs, locks)
4. `install_db()`
5. Install `frappe` + requested apps (`--install-app erpnext`)
6. Scheduler state read from DB (`System Settings.enable_scheduler`), effectively disabled on fresh sites
7. Optional `--set-default`

Non-interactive creation requires `--mariadb-user-host-login-scope=%` (container/horizontal scaling), `--db-root-password`, `--admin-password`. App install can be folded in with `--install-app erpnext`.

Config: `bench --site X set-config KEY VALUE` (writes through `frappe.installer.update_site_config`; `-g` for global, `-p` parses literal values).

### 2.3 REST API surface (verified in `frappe/api/v1.py`, `frappe/api/v2.py`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/method/login` | username/password → session cookie `sid` |
| POST | `/api/method/logout` | destroy session |
| GET/POST | `/api/method/<module.method>` | whitelisted RPC |
| GET | `/api/resource/<doctype>` | list (`fields`, `filters`, `order_by`, `limit_page_length`, `limit_start`, `or_filters`, `distinct`, `group_by`) |
| POST | `/api/resource/<doctype>` | create |
| GET/PUT/DELETE | `/api/resource/<doctype>/<name>` | read/update/delete |
| POST | `/api/resource/<doctype>/<name>` | execute doc method (`run_method=submit|cancel|...`) |
| — | `/api/v2/document/...`, `/api/v2/doctype/<d>/meta` | v2 rules (QueryBuilder lists, `has_next_page`) |

- Response envelope: `{ message, data, docs, exc_type, _server_messages, _debug_messages, _exc_source }`; errors carry `__frappe_exc_id`. Status codes: ValidationError 417, AuthN 401, Permission 403, Not found 404, Rate limit 429.
- Filter syntax: JSON string `[["field","=","value"], ...]`.
- Whitelist gate: non-whitelisted `/api/method/*` → PermissionError 403; guests restricted to `allow_guest` methods; guest inputs HTML-sanitized unless `xss_safe`.

### 2.4 Authentication (verified in `frappe/auth.py`, `frappe/sessions.py`)
Supported: session cookies, `Authorization: Basic base64(api_key:api_secret)`, `Authorization: token <api_key>:<api_secret>`, OAuth2 Bearer, hooks. API keys are `User.api_key` + encrypted `User.api_secret` (`generate_keys`, 15-char hashes).
- CSRF: required for unsafe methods (POST/PUT/DELETE/PATCH) **only when authenticated by session**; token auth is CSRF-exempt. Token via `X-Frappe-CSRF-Token` header or `csrf_token` form field.
- Session: `sid` cookie (httpOnly), default expiry 170h (configurable), stored in `tabSessions` + Redis `session:{sid}`.
- Brute-force: per-user + per-IP failed-login tracking; default 10 consecutive attempts then lock 60s.
- Rate limiting: global `frappe.conf.rate_limit` (redis windowed counter, 429 + headers); per-method `@rate_limit()` decorator.
- Service-to-service recommendation (verified): per-tenant **User with `api_key`/`api_secret`**, called with `Authorization: token <key>:<secret>`. No cookie/CSRF involvement. Optionally a `Frappe-Authorization-Source` header to use a custom credential doctype.

### 2.5 Authorization (verified in `frappe/permissions.py`)
- Roles: `Administrator` (all), automatic `Guest`/`All`/`Desk User`, plus business roles. ERPNext business roles for a small company: `Accounts Manager/User`, `Sales Manager/User`, `Purchase Manager/User`, `Item Manager/User`, `Stock Manager/User`, `HR Manager/User`, `Employee`, `Website Manager`.
- Enforcement: `has_permission` (server-side) for every read/write; `if_owner`; field-level read permissions; share; User Permissions; controller hooks. Lists apply match-conditions in SQL. **All authorization is server-side — the frontend can't bypass it.**

### 2.6 Company setup (verified in `erpnext/setup/`, `erpnext/setup/doctype/company/company.py`)
- ERPNext ships a **Setup Wizard** (`frappe.desk.page.setup_wizard`) that, per country, installs fixtures, creates the Company, creates defaults, and optionally demo data. `Company.on_update` auto-creates: chart of accounts (from `get_charts_for_country`; 73 verified templates + "Standard"), default warehouses (All Warehouses → Stores/WIP/Finished Goods/Goods In Transit), default cost centers, 14 default departments, default tax template (`setup_taxes_and_charges`), default accounts (Cash, Bank, Round Off, COGS, etc.).
- Chart of accounts is **country-driven**: India has a full CoA template; Saudi Arabia does not (falls back to "Standard"). Regional modules exist only for Australia, Italy, South Africa, Turkey, UAE, US. Country fixtures install item groups (Products/Raw Material/Services/Sub Assemblies/Consumable), territories, groups, modes of payment, item attributes, 239 UOMs, sales/buying defaults, standard price lists.
- System Settings controls `time_zone`, `date_format`, `time_format`, `number_format`, `float_precision`, `rounding_method`, `language`, `country`, `currency`; `Global Defaults` holds `default_company`, `default_currency`.
- Users: create via REST `/api/resource/User` (email, first_name, last_name, roles child table, `new_password`, `send_welcome_email`). Roles via `user.add_roles`. Password reset: whitelisted, rate-limited (3/hr), uniform response (anti-enumeration).
- Data import: `frappe.core.doctype.data_import` (doctype + `Importer`) supports CSV/XLSX, insert/update modes, child tables, template download/preview/start-import/status/log endpoints. (Note: the modern template endpoint is the **Data Export** doctype `export_data` with `template=true`.)
- Hooks of note: `after_install`, `after_migrate`, `scheduler_events`, `on_session_creation`, `boot_session`. ERPNext's `after_install` seeds analytics role, admin roles, incoterms, etc.

### 2.7 Site operations (verified against frappe command set + docs)
- Create: `bench new-site <site> --mariadb-user-host-login-scope=% --db-root-password ... --admin-password ... [--install-app erpnext]`
- Migrate/upgrade: `bench --site all migrate` (all sites on a bench migrate together)
- Backup: `bench --site X backup --with-files [--compress]` (defaults to `sites/<site>/private/backups`)
- Restore: `bench restore <file> --db-root-password ... --db-name ... --admin-password ... --install-app erpnext --with-public-files --with-private-files [--force]`
- Drop: `bench drop-site <site> [--no-backup]` (drops DB, archives site dir)
- **`bench copy-site` does NOT exist** in the current command set — site moves are backup→restore (or Press).

### 2.8 Webhooks
Frappe has a built-in per-DocType webhook system (`frappe.core.doctype.webhook`): trigger on doc events, custom URL/headers, and a shared secret verified via `X-Frappe-Webhook-Signature` (base64 HMAC-SHA256 of the payload). Useful for the platform to react to ERP events.

---

## 3. Multi-tenancy / scaling research (external)

- **Official model**: one bench, many sites; per-site DBs; host-header routing; per-site apps. Frappe Cloud itself runs most tenants on shared benches.
- **Scaling options** compared: (a) shared bench (cheapest, correct for small homogeneous tenants, single scheduler/worker pool — the design model), (b) Press control plane (self-hosted Frappe Cloud machinery: benches/release groups, site moves, resource caps, custom domains, auto-TLS) — the natural "at scale" evolution, (c) per-tenant isolated stacks (premium/dedicated tier only), (d) K8s (out of scope for MVP; `frappe/helm` not verified).
- **Sizing heuristic**: a bench uses ~400MB minimum; a small/medium tenant ≈ 1.5–2GB RAM total; a 16–32GB VM comfortably hosts ~8–15 small sites. Single scheduler tick (~4 min) serves all sites.
- **Pitfalls**: shared Redis/worker cross-talk across compose projects (frappe_docker #1437); all-or-nothing bench-wide upgrades; bench-wide assets (per-tenant branding needs per-bench images); DB-user host scope `%` required in containers; `bench config dns_multitenant on` for DNS routing.
- **Custom domains**: tenant subdomain `<t>.platform.com` with auto-TLS (nginx-proxy/acme-companion or compose.https.yaml); custom domains via `bench setup add-domain` + certs, or CNAME at scale. Flag: cookie/CSRF scope across custom domains must be validated.

## 4. Design / UX research digest

Full digest with sources is in `docs/design/UX_RESEARCH.md` (summary):
- **Onboarding**: value-first, single-step signup, 2–3 personalization questions, a finite visible stepper with **smart defaults** pre-filled from industry/country, auto-save draft, skippable steps, completion drops the user inside a useful screen (dashboard with sample data), plus a persistent setup checklist. Steps tied to activation checkpoints.
- **Data-heavy UI**: TanStack Table foundation (sorting, filtering, column visibility, density toggle, sticky header, hover row actions, selection-driven bulk bar with destructive confirm, `tabular-nums`, skeleton mirrors row layout, distinct empty vs no-results states, saved views).
- **Dashboards**: Stripe discipline — typography/whitespace hierarchy, color reserved for status, one restrained accent, role-metric-density-action framework, embedded reporting.
- **Nav**: sidebar for 5–15 top-level modules + top bar (global search/Cmd-K, notifications, tenant switcher, primary create); label modules by user intent (Sales, Inventory, Purchasing, Finance, People, Settings) not internal names.
- **Visual language**: light default + real dark mode, near-white surfaces, hairline borders, oklch-based tokens, radius ~0.5rem, editorial sans (Inter/Satoshi/Geist), soft shadows only on floating elements, micro-interactions with `prefers-reduced-motion` support.
- **Accessibility**: WCAG 2.2 (new criteria relevant to B2B: focus not obscured, accessible auth, target size, redundant entry), labels + `aria-describedby` errors, focus-visible states, ARIA dialog pattern, `aria-live` statuses.
- **21st.dev inventory**: strongest for data tables (TanStack), onboarding wizards, app-shell sidebars, command palettes, dashboards, auth flows, empty/skeleton states. Stack = shadcn/ui + Tailwind + React + Framer Motion + TanStack Table + Recharts. Recommended seeds: `felipemenezes098/table-20` (data table), `sshahaider/efferd-dashboard-2` (finance dashboard), `ddoemonn/wizard-steps` (onboarding), `arunjdass/dashboard-sidebar` (app shell), `lovesickfromthe6ix/omni-command-palette` (Cmd-K), `ddoemonn/skeleton-swap` (loading). Themes: use token architecture, hand-tune palette (don't adopt stock themes as-is).

## 5. Confirmed product decisions (user-approved)

| Decision | Choice |
|---|---|
| Platform stack | TypeScript monorepo — Next.js (web), NestJS (API), Prisma + Postgres (platform DB), Redis + BullMQ (workers), shadcn/ui + Tailwind + TanStack Query/Table |
| Provisioning | Shared bench, bench-driven; platform worker runs `bench` idempotently with a persistent state machine; Press at scale later |
| Product name | **Amni** |
| Tenant access | Hybrid — our frontend is the primary product (all ERP ops via our API using a per-tenant least-privilege service account); provisioning also creates per-user ERPNext accounts so admins can optionally use the native desk at `<tenant>.<platform>` |

## 6. Architecture decisions (high level)

1. **Two stores**: platform DB (Postgres) = users, companies, tenants, plans, subscriptions, provisioning jobs, invitations, audit. ERPNext = tenant business data. Never mix.
2. **Tenant isolation at two layers**: (a) ERPNext per-site DB isolation (native); (b) our API resolves tenant strictly from server-side membership/roles — never from client-supplied tenant ids for data access. A user can only ever reach their own tenant's ERPNext site, via their tenant's service account.
3. **Service account per tenant**: `amni-integration@<tenant>` user with scoped business roles + API key/secret stored in the platform secret store (encrypted). Our backend is the only caller for MVP.
4. **Provisioning state machine**: `CREATED → QUEUED → PROVISIONING → CONFIGURING → VALIDATING → READY` (+ `*_FAILED`, retryable). Idempotent steps; every step checks actual ERP state before acting; async via BullMQ; full audit trail in `ProvisioningJob.logs`.
5. **Frontend never talks to ERPNext directly.** All data flows: `Frontend → Amni API → ERPNext integration layer → tenant site`.
6. **No ERPNext core modifications.** Configuration, custom fields, workflows, roles, and (where needed) a tiny custom app in the bench are the extension mechanisms. Upgrades remain `bench migrate`.
7. **Observability**: structured logs + request IDs end-to-end (`User → Frontend → API → Worker → ERPNext → Result`); provisioning log trail in DB; error tracking; audit log for sensitive actions.

## 7. Tech risks / open questions

### Known risks
| Risk | Impact | Mitigation |
|---|---|---|
| Single scheduler + worker pool for all sites | noisy tenant slows others | move noisy/large tenants to own bench (documented path); resource caps later |
| Bench-wide upgrade = all sites migrate together | no per-tenant versioning | pin versions; run migrations in maintenance window; Press (release groups) at scale |
| Shared MariaDB resource contention | one runaway query affects all | per-site DB users; monitoring; connection pools; premium tier gets dedicated DB |
| `bench copy-site` absent | no in-place site move | backup→restore; document migration runbook |
| CSRF/cookie scope on tenant custom domains | SSO/embedded sessions may break across domains | MVP uses platform UI + API; validate cookie-domain behavior before enabling custom-domain desk |
| API-key secret rotation | key leak = full tenant access | store encrypted; add rotation job; audit usage; document rotation runbook |
| Tenant-created data naming collisions | auto-named records (items/warehouses) may collide across tenants | per-tenant DB isolation makes collisions impossible; only care about per-site auto-generated names |
| Provisioning on a busy bench | long `new-site` waits | async + state machine + progress UI; queue capacity per bench |
| Design quality drift | pages diverge from design system | mandatory shared `@amni/ui` components; design review in PR checklist; Storybook |

### Open questions (to resolve during build)
1. Exact role set for the per-tenant service account (least privilege that still covers sales→inventory→purchasing→finance). Plan: a custom role (or role bundle) evaluated against real flows in Phase 3.
2. Whether to run provisioning via `docker exec` (MVP) vs a dedicated provisioning container/agent. MVP: `docker exec` on the bench backend; extract to an agent when moving to Press.
3. Platform domain strategy in dev (`*.localhost`) vs prod (wildcard DNS). MVP dev: `http://<tenant>.localhost:8080`.
4. Email delivery provider for verification/reset/import notifications (dev: console/SMTP; prod: provider).
5. Whether `bench config dns_multitenant on` is required with frappe_docker's current `$host` nginx (verified routing works via Host header; confirm on a second site in Phase 3).
6. Full SSO (OAuth/SAML) into ERPNext desk — deferred as an enhancement; hybrid model (same credentials) covers MVP.
7. Recharts vs other chart libs for premium dashboards (Recharts is the 21st default; evaluate visx/echarts for heavy data).

## 8. Deliverables produced in this phase

- Repo `Aa070078/amni` (private), default branch `dev` for integration, `main` for releases
- `DISCOVERY_REPORT.md` (this file)
- `PRODUCT_SPEC.md` · `ARCHITECTURE.md` · `AGENTS.md` · `CONTRIBUTING.md` · `DEVELOPMENT.md` · `SECURITY.md` · `TESTING.md` · `DEPLOYMENT.md` · `README.md`
- `docs/design/UX_RESEARCH.md` (full citable digest)
- GitHub milestones + initial issue backlog
- Initial monorepo skeleton

## 9. Recommended next step

Phase 1 (ARCHITECTURE) is delivered as the `ARCHITECTURE.md` + supporting docs; proceed to Phase 2 (FOUNDATION): monorepo scaffold, CI, design system, auth, platform DB schema, then Phase 3 (TENANT + PROVISIONING) which proves the end-to-end provisioning state machine against the running bench.
