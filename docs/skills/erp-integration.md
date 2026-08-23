---
name: erp-integration
summary: Guidance for using `packages/erp` safely; tenant resolution, ERPNext access, and cross-tenant isolation.
---

# ERP Integration (repo skill)

Purpose: concise rules for agents working with the ERPNext integration layer in this repo.

When to use
- When building or modifying `packages/erp` client methods.
- When adding API endpoints that call ERPNext through `ErpGatewayModule`.

Do
- Resolve tenant scope server-side from membership, never from client input.
- Load the tenant's `ERPInstance` and decrypt service account keys only in `packages/erp`.
- Use the official ERPNext REST API endpoints (`/api/v1/resource`, `/api/method`, doc methods) only.
- Map ERPNext errors into the platform envelope and preserve request ids for debugging.
- Add tenant isolation tests for any ERP-backed route.

Don't
- Call ERPNext directly from a page or controller without the `ErpGatewayModule`.
- Use raw SQL or private ERPNext internals.
- Copy ERP tenant business data into the platform DB.

Quick pointers
- ERP client path: `packages/erp/src`
- Gateway module: `apps/api/src/erp-gateway`
- Tenant models: `packages/db` Prisma `Tenant` and `ERPInstance`

See: `ARCHITECTURE.md` §7 and `SECURITY.md` §4.
