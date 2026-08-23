# Production runbook

This runbook is the minimum supported single-region production topology for Amni. It does not contain credentials. A launch operator must provide a Linux host or orchestrator, DNS, an SMTP account, object storage, monitoring, and a separately administered ERP host.

## Release invariants

- Production runs immutable, explicitly tagged platform images and the ERP image versions recorded in the release notes.
- `main` cannot be promoted unless unit, isolation, static-security, typecheck, and real clean-site ERP gates pass.
- The platform and ERP databases are separate stores. Both must be backed up and restored in the same drill window.
- API and worker receive the same `ENCRYPTION_KEY`; API and ERP receive the same HRMS SSO secret.
- The worker reaches the ERP host over SSH with a pinned host key. Never mount the host Docker socket into an internet-facing platform container.
- The SSH account is restricted on the ERP host to the approved provisioning command wrapper and the named bench container.

## First deployment

1. Create `production.env` outside the repository from `infra/docker/production.env.example`.
2. Generate independent random secrets. Store them in the deployment secret manager; do not send them in chat, tickets, or logs.
3. Publish `A/AAAA app.<domain>` to the platform proxy and wildcard tenant DNS to the ERP proxy. Keep both environments private until verification completes.
4. Pin the ERP SSH host key with `ssh-keyscan` from a trusted network and verify its fingerprint out of band. Mount the resulting file through `ERP_SSH_KNOWN_HOSTS_FILE`.
5. Run preflight:

   ```powershell
   ./infra/docker/scripts/production-preflight.ps1 -EnvFile /run/secrets/amni-production.env
   ```

6. Pull the immutable images, then start the platform. The one-shot `migrate` service must complete before API, worker, and web start:

   ```bash
   docker compose --env-file /run/secrets/amni-production.env \
     -f infra/docker/compose.prod.yaml pull
   docker compose --env-file /run/secrets/amni-production.env \
     -f infra/docker/compose.prod.yaml up -d
   ```

7. Confirm Caddy obtained a trusted certificate, `/api/v1/healthz/live` and `/api/v1/healthz/ready` return 200, and no container has a restart loop.
8. Run `monitor-production.ps1`, the browser critical journey, and a clean tenant provisioning. Confirm the tenant uses restricted credentials and appears healthy in the platform admin console.

## Backups

Platform Postgres:

```powershell
./infra/docker/scripts/backup-platform.ps1 \
  -EnvFile /run/secrets/amni-production.env \
  -OutputDirectory /mnt/encrypted-backup-staging
```

Each ERP tenant:

```powershell
./infra/erp/scripts/backup-site.ps1 \
  -Site tenant.example.com \
  -OutputDirectory /mnt/encrypted-backup-staging/erp
```

The output directory must be an encrypted, access-controlled staging mount. Upload the backup plus its SHA-256 manifest to versioned off-cluster object storage, then remove the staging copy under the operator's retention policy. Daily jobs retain 30 daily and 12 monthly restore points. Alert if a job, upload, checksum, or inventory reconciliation fails.

## Restore drills

Run monthly in staging and quarterly from a randomly selected production backup. The platform drill creates a randomized disposable database and always drops that exact database:

```powershell
./infra/docker/scripts/restore-platform-drill.ps1 \
  -EnvFile /run/secrets/amni-staging.env \
  -BackupFile /mnt/restore-input/amni-platform-20260819T000000Z.dump
```

The ERP drill creates a randomized `restore-<id>.localhost` site, restores files and database, migrates it, verifies ERPNext is installed, and drops that exact site:

```powershell
./infra/erp/scripts/restore-site-drill.ps1 \
  -DatabaseBackup /mnt/restore-input/database.sql.gz \
  -PublicFilesBackup /mnt/restore-input/files.tar \
  -PrivateFilesBackup /mnt/restore-input/private-files.tar \
  -DbRootPassword '<from-secret-manager>' \
  -AdministratorPassword '<temporary-random-password>'
```

Record backup timestamp, checksum, recovery duration, row/site validation, operator, and ticket. A successful backup without a successful restore drill does not satisfy the release gate.

## Monitoring and alerts

- Scrape or probe `/api/v1/healthz/live` for process liveness and `/api/v1/healthz/ready` for Postgres/Redis readiness. Readiness returns HTTP 503 when either dependency is unavailable. The legacy `/healthz` control-plane report remains available for compatibility.
- Run `monitor-production.ps1` from outside the cluster every minute. Include an ERP Host-header ping from the private monitor.
- Ship JSON logs from Caddy, API, and workers to an append-only log service. Alert on 5xx rate, p95 latency, authentication lockouts, provisioning failures, queue backlog, tenant ERP unreachable state, and backup failures.
- Use `requestId`, BullMQ `jobId`, company id, and tenant id to correlate events. Never add decrypted keys, cookies, authorization headers, invoice content, or contact data to logs.
- Minimum paging thresholds: readiness failure twice in two minutes; 5xx >2% for five minutes; p95 API >1.5 seconds for ten minutes; provisioning job running >20 minutes; no successful backup within 26 hours; certificate expiry <21 days.

## Upgrade and rollback

1. Back up both stores and verify the latest manifests.
2. Deploy the release to staging and run the browser journey plus `release-gate.ps1`.
3. Apply additive platform migrations with the new image's one-shot migrate job.
4. Deploy API, worker, and web; monitor errors and latency for 30 minutes.
5. ERP version changes require a maintenance window and `bench --site all migrate` on staging first.

For application rollback, redeploy the previous immutable image set. Prisma migrations are forward-only: create a corrective migration instead of editing or reverting applied history. For an incompatible ERP schema change, stop writes, restore the matched previous ERP image and verified pre-upgrade site backups. Never run an older ERP image against a newer incompatible schema.

## Secret rotation

- Rotate access signing, HRMS SSO, SMTP, database, Redis, and SSH credentials through a staged dual-key procedure where supported.
- Rotate each tenant ERP service token on schedule and immediately after suspected disclosure. Persist only its encrypted replacement.
- `ENCRYPTION_KEY` rotation requires an audited re-encryption job for every `ERPInstance`; do not replace it in place or existing credentials become unreadable.
