# packages/db — Platform database (Prisma + Postgres)

Schema, migrations, and client for the `amni_platform` database: users, companies, tenants, ERP instances, plans/subscriptions, provisioning jobs, invitations, audit logs, notifications.

**Rules:** tenant business data never lives here; every schema change ships with a migration. See `ARCHITECTURE.md §4`.
