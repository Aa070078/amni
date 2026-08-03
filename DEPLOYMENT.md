# Deployment — Amni

Operational guide for environments, deployment, backups, monitoring, rollbacks, and scaling. Contains no real secrets.

---

## 1. Architecture

Two independently deployable systems:

1. **Amni platform** (our product): `apps/web` (Next.js), `apps/api` (NestJS), `apps/worker` (BullMQ consumers), Postgres, Redis. Runs behind a reverse proxy (Caddy or Traefik) with TLS.
2. **ERP cluster** (frappe_docker): one bench; one site per tenant; MariaDB + Redis + workers; nginx frontend routes by Host header. Wildcard TLS for `<tenant>.<domain>`.

Both share the domain: `app.<domain>` (platform) and `<tenant>.<domain>` (ERP desk). DNS: wildcard A/CNAME `*.<domain>` → ERP proxy; `app.<domain>` → platform proxy.

## 2. Environments

| Env | Purpose | Data |
|---|---|---|
| `dev` | local development | local Postgres/Redis + local frappe_docker bench |
| `staging` | pre-prod validation | separate Postgres + staging bench (same images/versions) |
| `production` | real tenants | separate everything; backups; monitoring |

Never point a non-prod environment at production data.

## 3. Platform deployment (Docker Compose)

```bash
# build + start
docker compose -f infra/docker/compose.yaml --profile prod up -d --build
```

Services: `web`, `api` (replicas ≥2), `worker`, `postgres`, `redis`, `proxy` (Caddy/Traefik), `migrate` (one-shot Prisma migrate on deploy). Rolling updates: `api`/`worker` are stateless (scale horizontally); apply DB migrations before releasing code (`pnpm db:migrate` in the migrate job).

### Environment variables
`infra/docker/.env.example` documents every variable: `DATABASE_URL`, `REDIS_URL`, session/refresh secrets, `ENCRYPTION_KEY`, `SMTP_*`, `SENTRY_DSN`, `PLATFORM_URL`, `PLATFORM_DOMAIN`, `ERPNEXT_CLUSTER_*`, CORS origins. Secrets come from the secret manager at runtime (never baked into images).

## 4. ERP cluster deployment (frappe_docker)

Provision per the official frappe_docker docs, with the Amni wrapper in `infra/erp`:

- Use the full override set: `compose.mariadb.yaml` + `compose.redis.yaml` + `compose.noproxy.yaml` (or `compose.https.yaml` for TLS).
- `PULL_POLICY=missing`; pin `ERPNEXT_VERSION`.
- Wildcard TLS via nginx-proxy/acme-companion override; `FRAPPE_SITE_NAME_HEADER=$host`.
- Tenant site provisioning is performed by the Amni worker (bench-driven) — do not create sites manually except for the first dev site.

### Versioning
- Platform code and the ERPNext image version are coupled in the release notes. Upgrading ERPNext = `bench --site all migrate` in a maintenance window (all sites on a bench migrate together). Pin versions; test on staging first.

## 5. Database

- **Platform (Postgres):** managed by Prisma migrations (`pnpm db:migrate`). Automated `pg_dump` daily + WAL archiving (point-in-time recovery) in prod. Restore drills quarterly.
- **ERP (MariaDB):** per-site DBs. Backups per tenant via `bench --site <site> backup --with-files [--compress]`, scheduled by the platform (`backup` queue) or a cron; stored off-cluster (object storage), encrypted at rest; retention 30d daily + 12 monthly. Restore runbook below.

### Backup runbook (tenant site)
```bash
# On the bench host:
docker compose -p frappe exec backend bench --site <tenant.domain> backup --with-files --compress
# Restore (new site):
docker compose -p frappe exec backend bench restore <file>.sql.gz \
  --mariadb-user-host-login-scope=% --db-root-password <pw> --admin-password <pw> \
  --db-name <restored-db> --install-app erpnext --with-public-files --with-private-files
```
Test restores regularly; a backup that cannot be restored is not a backup.

## 6. Reverse proxy & TLS

- Platform proxy: Caddy (auto-TLS) or Traefik; terminate TLS; set security headers (HSTS, CSP, X-Frame-Options).
- ERP proxy: nginx-proxy + acme-companion with a wildcard cert; `FRAPPE_SITE_NAME_HEADER` handles per-tenant routing.
- Certificates: auto-renewed; alert on expiry.

## 7. Monitoring & observability

- Logs: pino JSON; shipped to the log aggregator (Loki/CloudWatch); correlation by `requestId`/`jobId`.
- Errors: Sentry (API + web + worker), tenant-scoped context, PII redacted.
- Metrics: Prometheus + Grafana — API latency/errors, queue depth (`bull:*`), job durations, provisioning success rate, per-tenant health.
- Health: platform `/healthz` (DB, Redis, queues); per-tenant health checks (ping + service-account probe) with alerting on failures.
- Alerts: provisioning stuck > threshold, tenant health down, backup failures, rate-limit spikes, 5xx spikes.

## 8. Rollbacks

- **Platform code:** images are tagged; roll back by redeploying the previous image. DB migrations are forward-only with additive-first policy; if a migration must be reverted, add a reversal migration (never force-drop in prod). 
- **ERP version:** bench-wide upgrade → keep the previous image; rollback = restore image + `bench --site all migrate` on the old version (restore from backup if schema incompatible). Documented in the release runbook.

## 9. Scaling

- Platform: scale `api`/`worker` horizontally (BullMQ distributes jobs). Postgres/Redis: managed or primary+replica.
- ERP: shared bench holds ~8–15 small sites on a 16–32 GB node (heuristic). Beyond that: **split benches** (groups of sites per bench, worker picks by capacity) → **Press** (release groups, site moves, resource caps) → per-tenant dedicated stacks for premium → K8s for HA/multi-region. See `ARCHITECTURE.md §12`.

## 10. Disaster recovery

- **RPO/RTO targets:** platform DB RPO 5 min (WAL), RTO < 30 min (automated restore + image rollback); tenant ERP RPO 24 h (daily backup), RTO < 4 h (restore runbook).
- Drills: quarterly restore drill for both stores; documented in the runbook.
- Incident flow: see `SECURITY.md §11`.

## 11. Release process

1. Merge to `dev` → CI (integration + isolation + e2e).
2. Tag release candidate → staging deploy → smoke test (critical journey).
3. Merge to `main` → release: migrate platform DB → rolling deploy `api`/`worker`/`web` → run ERP migrations if version bump → smoke + health checks → changelog.
