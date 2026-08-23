---
name: provisioning
summary: Guidance for provisioning state machine, idempotency, and safe worker retries used by `apps/worker`.
---

# Provisioning Skill (repo)

Purpose: short actionable guidance for agents working on provisioning related code paths (`apps/worker`, `packages/erp`, `apps/api` provisioning endpoints).

When to use
- When editing provisioning steps, state machine logic, job retries, or adding new provisioning steps.

Do
- Respect idempotency: each step must check existing ERP state before performing an action.
- Use `ProvisioningJob` `idempotencyKey` and persist `steps` + `logs` in Postgres.
- Queue work into BullMQ `provisioning` queue; do not run long blocking tasks in request handlers.
- Emit events and update tenant `status` fields atomically.

Don't
- Shell to bench without capturing stdout/stderr and persisting them to job logs.
- Assume local bench state; always verify via tenant site probes.

Quick pointers
- Worker queue: `apps/worker/src/jobs/provisioning.processor.ts`.
- Job model: `packages/db` Prisma `ProvisioningJob`.
- Bench exec: docker exec commands run on the ERP cluster host — use `infra/erp` runbook.

See: `ARCHITECTURE.md` §6 and `DEVELOPMENT.md` provisioning runbook.
