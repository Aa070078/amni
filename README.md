# Amni

**A multi-tenant ERP SaaS platform built on ERPNext/Frappe.**

Any business signs up, answers a few simple questions, and gets a complete, provisioned ERP — while using Amni's own premium frontend as the product. ERPNext runs underneath as the business-management engine; users never need to understand it.

> Current status: **M1 Foundation — auth shipped on `dev`.** Next: M2 Reference Build (premium ERP UI) then M3 tenant + provisioning.

---

## Highlights

- **Instant ERP**: sign up → create company → setup wizard → automatic ERP provisioning → ERP ready.
- **Isolation**: every company gets its own ERPNext site (own MariaDB database) with per-tenant service accounts.
- **Modern product UI**: design-system driven (shadcn/ui + Tailwind), data-table core, onboarding wizard, command palette — not default ERPNext.
- **Architected for scale**: shared-bench MVP with a documented path to Press, per-tenant dedicated stacks, and K8s.

## Repository map

```
apps/web       Next.js product frontend
apps/api       NestJS control-plane API
apps/worker    BullMQ job processors (provisioning, imports, mail)
packages/ui    Design system
packages/db    Prisma schema + migrations (platform DB, Postgres)
packages/erp   ERPNext REST client (per-tenant service accounts)
packages/shared Shared API contract (zod schemas + types)
infra/docker   Platform deployment (postgres, redis, api, worker, web)
infra/erp      ERPNext cluster (frappe_docker) wrapper
docs           Design research, ADRs, runbooks
```

## Quick start

```bash
pnpm install
docker compose -f infra/docker/compose.yaml up -d   # postgres + redis
pnpm db:migrate && pnpm db:seed
pnpm dev                                            # web + api + worker
```

Full setup — including running the ERPNext cluster — is in [DEVELOPMENT.md](DEVELOPMENT.md).

## Documentation

| Doc | Purpose |
|---|---|
| [PRODUCT_SPEC.md](PRODUCT_SPEC.md) | Product vision, journey, wizard, page inventory, permissions |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, multi-tenancy, provisioning, integration |
| [AGENTS.md](AGENTS.md) | Operational instructions for developers and AI agents |
| [DISCOVERY_REPORT.md](DISCOVERY_REPORT.md) | Phase 0 findings, risks, decisions |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Local setup + troubleshooting |
| [SECURITY.md](SECURITY.md) | Threat model, authz, isolation, incident response |
| [TESTING.md](TESTING.md) | Testing strategy incl. tenant-isolation tests |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Environments, backups, monitoring, scaling |

## Core journey (acceptance proof)

```
Landing → Sign Up → Verify → Create Company → Setup Wizard → Provision ERP
→ ERP Ready → Dashboard → Create Customer → Create Product → Create Sales Order
→ Create Invoice → Record Payment → View Dashboard
```

## License

Proprietary (internal). All rights reserved.
