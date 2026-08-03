# packages/erp — ERPNext integration client

Typed client over the official ERPNext REST API (`/api/v1`), per-tenant service-account auth, tenant resolution + isolation enforcement, provisioning helpers (site/company/config/roles/import).

**Rules:** the only code that talks to ERPNext; never bypass via raw calls; isolation tests required. See `ARCHITECTURE.md §8`, `AGENTS.md §7`.
