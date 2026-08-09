# Deployment — Railway

Reference for hosting the Amni demo on Railway. The stack is web (Next.js) + API (NestJS) + Postgres + Redis. No ERPNext cluster is required for the demo: every API module serves in-memory reference data.

Local verification of the exact Docker artifacts lives in `infra/docker/compose.preview.yaml` and the Dockerfiles in `infra/docker/`.

## Architecture

```
Web (Next.js, Railway service, port 3000)
  │  browser: https://<web>.up.railway.app  (cookies: SameSite=Lax, Secure)
  ▼
API (NestJS, Railway service, port 4000)   ← CORS allowlist: WEB_ORIGIN
  │
  ├── Postgres (Railway plugin)             ← DATABASE_URL
  └── Redis (Railway plugin)                ← REDIS_URL (optional; lazyConnect warns if down)
```

- API exposes routes under `/api/v1`; `healthz` is excluded from the prefix.
- Auth uses `HttpOnly; Secure; SameSite=Lax` cookies. All Amni services live on `*.up.railway.app`, which is one site, so cookies and CSRF flow between the web and API origins without extra config.
- Demo accounts are seeded idempotently at container start (`seed-demo-user.ts`):
  - `demo@amni.dev` / `demo12345` (Demo Admin, owner of company `demo-co`)
  - `member@amni.dev` / `member12345` (Demo Member)
- Quick Login buttons on the login page are hidden in production **unless** `NEXT_PUBLIC_DEMO_MODE=true` is baked into the web image.

## Setup

1. From Railway dashboard, **New Project → Deploy from GitHub repo** → select the Amni repo. Railway will detect multiple services; create them individually as described below (do not accept the auto-suggested template).
2. Add a **Postgres** plugin → copy `DATABASE_URL` (internal URL).
3. Add a **Redis** plugin → copy `REDIS_URL` (internal URL).
4. Create the **API** service:
   - Source: the repo, root directory = repo root.
   - Builder: Dockerfile. Set Dockerfile path to `infra/docker/Dockerfile.api`.
   - Port: `4000`.
   - Env: see table below.
5. Create the **Web** service:
   - Source: the repo, root directory = repo root.
   - Builder: Dockerfile. Set Dockerfile path to `infra/docker/Dockerfile.web`.
   - Port: `3000`.
   - Env / Build args: see table below.
6. (Optional) Create the **Worker** service (`apps/worker`, BullMQ). Not needed for the demo — provisioning is not exercised and no ERP calls are made. Redis being down only logs a warning.
7. Deploy. Railway resolves the internal hostnames `postgres`/`redis` (or the actual plugin service names) automatically for `DATABASE_URL`/`REDIS_URL`.

## Environment variables

### API service

| Variable | Example | Notes |
|---|---|---|
| `PORT` | `4000` | |
| `NODE_ENV` | `production` | |
| `DATABASE_URL` | from Postgres plugin | Internal URL. `prisma migrate deploy` runs at container start. |
| `REDIS_URL` | from Redis plugin | Optional for the demo (lazyConnect). |
| `WEB_ORIGIN` | `https://<web>.up.railway.app` | Comma-separated CORS allowlist; must include the web's public URL. |
| `PLATFORM_URL` | `https://<web>.up.railway.app` | Public web URL. |
| `PLATFORM_DOMAIN` | `<web>.up.railway.app` | Used for tenant subdomains; not exercised in demo. |
| `ACCESS_TOKEN_SECRET` | random, **≥ 32 chars** | API refuses to boot with a shorter secret. |
| `ACCESS_TOKEN_TTL_SECONDS` | `900` | |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | |

### Web service

| Variable | Example | Notes |
|---|---|---|
| `PORT` | `3000` | |
| `NEXT_PUBLIC_API_BASE_URL` | `https://<api>.up.railway.app/api/v1` | Public API URL (browser-facing). |
| `NEXT_PUBLIC_APP_URL` | `https://<web>.up.railway.app` | |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | Shows Quick Login in production. Set at build time. |

`NEXT_PUBLIC_*` values are inlined at build time — they must be set **before** the web build runs (Railway build args / build-time env).

## Post-deploy checklist

- [ ] `GET https://<api>.up.railway.app/healthz` → 200.
- [ ] `POST https://<api>.up.railway.app/api/v1/auth/login` with `demo@amni.dev` / `demo12345` → sets `amni_access`, `amni_refresh`, `amni_csrf` cookies; redirects to dashboard.
- [ ] Web shows **Quick Login** on `/login` (requires `NEXT_PUBLIC_DEMO_MODE=true` baked into the image).
- [ ] Protected endpoint returns data, not `401`: `GET /api/v1/dashboard/overview` with the session cookie.

## Debugging

- **API logs**: migration + seed + Nest boot all stream to stdout; `Nest application successfully started` confirms a healthy boot.
- **CORS errors in browser**: confirm `WEB_ORIGIN` exactly matches the web's public origin (no trailing slash).
- **401 on protected routes in browser**: cookies must be `Secure` and the page served over HTTPS — plain `http://` will drop them.
- **Wrong query engine**: the Dockerfile regenerates the Prisma client (`prisma generate`) in the runtime stage; if a client/engine mismatch appears, rebuild from scratch (`docker build --no-cache`).
- **Local smoke test**: `docker compose -f infra/docker/compose.preview.yaml up --build` runs the exact images locally (Postgres on 5433, Redis on 6380).
