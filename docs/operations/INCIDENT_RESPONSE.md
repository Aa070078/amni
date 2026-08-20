# Incident response

Severity 1 includes suspected cross-tenant access, credential disclosure, destructive data loss, total platform outage, or an inability to restore. Severity 2 includes a single-tenant outage, delayed queues, or a major degraded feature.

## First 15 minutes

1. Assign incident commander, operations lead, communications lead, and scribe. Start an append-only incident timeline.
2. Preserve logs and audit records. Record request ids, job ids, affected tenant ids, first detection time, and deployed image digests. Do not copy PII or secrets into the incident channel.
3. Contain the narrowest verified scope: disable the affected tenant, revoke its ERP token, pause provisioning, or remove the faulty release from the proxy. Do not destroy evidence.
4. For any isolation concern, stop tenant-facing writes globally until two-tenant negative tests and log review establish the blast radius.
5. Communicate an initial factual status and next update time. Do not speculate.

## Diagnosis and recovery

- Platform dependency: inspect `/healthz/ready`, Postgres, Redis, queue depth, and the first unique 5xx errors by `requestId`.
- ERP dependency: inspect tenant health, service-account identity, Frappe request id, scheduler/worker state, and the tenant site's database reachability.
- Provisioning: stop retries if the operation is non-idempotent; otherwise repair the failed step and resume the persisted state machine.
- Data loss: freeze writes, select the latest checksum-valid recovery point inside the RPO, restore to an isolated target, validate counts and business invariants, then perform a controlled cutover.
- Bad release: redeploy the previous immutable platform images. Use a corrective database migration; never rewrite applied migration history.

## Closure

Recovery requires healthy external probes, stable error/latency rates for 30 minutes, queue drain, tenant-specific verification, and confirmation that backups continued. Within five business days publish a blameless postmortem with impact, timeline, root cause, contributing controls, detection gap, corrective owners/dates, and regression tests.

Security notifications, regulatory assessment, and customer communications must be handled by qualified legal/security owners for the launch jurisdiction. Repository automation cannot replace those obligations.
