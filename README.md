# Hono Template

Production-ready Hono API template — TypeScript, Drizzle, Redis, Sentry, Better Auth, OpenAPI docs.

---

## Quick start

```bash
bun create hono@latest my-app
cd my-app
bun run setup   # transforms the bare Hono scaffold into this template
```

`bun run setup` installs all dependencies, writes the project structure, configures linting/formatting/pre-commit hooks, and patches `package.json` with the template's scripts. Re-run with `--force` to overwrite existing files.

## Install globally (one-time)

The `hono-setup` command is exposed via `bun link` from this repo:

```bash
git clone https://github.com/<you>/hono-template
cd hono-template
bun link
```

After this, `hono-setup` is on your PATH (Bun adds the symlink to `~/.bun/bin`).

### Use it on a new project

```bash
mkdir my-app && cd my-app
bun create hono@latest .
hono-setup                # full run
hono-setup --skip-deps    # skip bun add (deps already installed)
hono-setup --force        # overwrite existing files
hono-setup --dry-run      # preview changes
```

The command always operates on the current working directory, so `cd` first.

> **Windows note:** `bun link` creates symlinks. If it fails with a permissions error, enable [Developer Mode](https://learn.microsoft.com/en-us/windows/apps/get-started/enable-your-device-for-development) or run from an elevated shell.

## Prerequisites

- [Bun](https://bun.sh) 1.2+
- Node.js 20+
- Docker Desktop (for local Postgres/Redis)

## Scripts

| Script                                               | Purpose                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| `bun run dev`                                        | Start Docker services + dev server (concurrently)             |
| `bun run dev:docker`                                 | Start Postgres, Redis, neon-proxy, upstash-proxy, cloudflared |
| `bun run dev:server`                                 | Start the dev server with hot-reload (tsx watch)              |
| `bun run lint` / `lint:fix`                          | oxlint                                                        |
| `bun run format` / `format:check`                    | oxfmt                                                         |
| `bun run typecheck`                                  | `tsc --noEmit`                                                |
| `bun run test` / `test:watch`                        | vitest                                                        |
| `bun run build`                                      | `tsc` to `dist/`                                              |
| `bun run db:generate`                                | Generate SQL migration from schema changes                    |
| `bun run db:migrate`                                 | Apply pending migrations                                      |
| `bun run db:push`                                    | Push schema directly (dev only)                               |
| `bun run db:studio`                                  | Launch Drizzle Studio                                         |
| `bun run db:seed`                                    | Run `src/db/seed.ts`                                          |
| `bun run docker:build` / `docker:up` / `docker:down` | Production Docker stack                                       |
| `bun run setup`                                      | Re-run the template setup (rebuild the project)               |

## Project structure

```
src/
  index.ts                  # Main Hono app — middleware, routes, error handling
  instrument.ts             # Sentry init (imported first)
  serve.ts                  # @hono/node-server bootstrap
  serve-local.ts            # Local dev defaults + serve
  api/v1/router.ts          # v1 API router — mount sub-routers per domain
  core/
    env.ts                  # Zod-validated env (single source of truth)
    db.ts                   # Drizzle + neon-serverless (or local neon-proxy)
    redis.ts                # Upstash Redis
    cache.ts                # Upstash Redis-backed cache
    rate-limiter.ts         # @upstash/ratelimit + globalRatelimit middleware
    logger.ts               # pino (pino-pretty in dev)
    request-context.ts      # AsyncLocalStorage for requestId/correlationId/logger
    errors.ts               # AppError + helpers (badRequest, notFound, …)
    error-handlers.ts       # onErrorHandler — Sentry, logging, envelope
    openapi-config.ts       # OpenAPI doc metadata, security, servers
  middleware/
    request-context.ts      # requestLifecycle — request id, correlation id, logging
    auth-middleware.ts      # authMiddleware + buyer / seller / admin guards
  db/
    custom-types.ts         # Custom Drizzle column types
    enums.ts                # pg enums
    models/index.ts         # Table exports (Drizzle schema root)
    relations.ts            # Drizzle relations
    seed.ts                 # drizzle-seed
  utils/
    auth.ts                 # Better Auth instance (Drizzle adapter)
tests/
  setup.ts                  # Vitest global setup
.github/workflows/ci.yml    # CI: install → lint → format:check → typecheck → test → build
Dockerfile                  # Multi-stage: install → build → slim runtime
docker-compose.yml          # Local: postgres + redis + neon-proxy + upstash-proxy + cloudflared
docker-compose.prod.yml     # Production: app + postgres + redis
docker-compose.act.yml      # Local GitHub Actions via `act`
drizzle.config.ts           # Drizzle Kit config
vercel.json                 # Vercel deploy config
.vscode/                    # Recommended extensions + format-on-save settings
.husky/pre-commit           # `bun x lint-staged`
```

## Endpoints (dev)

| Path            | Description                         |
| --------------- | ----------------------------------- |
| `GET /health`   | Liveness check                      |
| `GET /openapi`  | Raw OpenAPI spec (non-prod)         |
| `GET /docs`     | Scalar interactive docs (non-prod)  |
| `GET /llms.txt` | LLM-friendly API summary (non-prod) |
| `* /api/auth/*` | Better Auth handler                 |

The `/openapi`, `/docs`, and `/llms.txt` routes are mounted only when `APP_ENV !== "production"` (or when running on Vercel).

## Environment

Validated by Zod in `src/core/env.ts`. See `.env.example` for the full list. At minimum you need:

- `DATABASE_URL` — Postgres connection string
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — Redis (use the `upstash-proxy` from `docker-compose.yml` locally)
- `BETTER_AUTH_SECRET` — generate with `openssl rand -base64 32`
- `BETTER_AUTH_URL` — base URL of the API

## Authentication

Powered by [Better Auth](https://better-auth.com). The instance lives in `src/utils/auth.ts` with a Drizzle adapter. Role-based guards (`buyer` / `seller` / `admin`) live in `src/middleware/auth-middleware.ts`. To wire roles into the `user` table, run:

```bash
bunx @better-auth/cli@latest generate
bunx drizzle-kit push
```

## Deployment

- **Docker**: `bun run docker:build && bun run docker:up`
- **Vercel**: `vercel.json` is pre-configured; just link the repo
- **Cloudflare Workers**: swap `@hono/node-server` in `src/serve.ts` for the CF adapter

Set production secrets in `.env.production` (git-ignored) before deploying.

## See also

- `scripts/setup.ts` — the setup script itself (read it to see exactly what the template installs)
- `scripts/stubs.ts` — the file contents the setup script writes
- `TODO.md` — checklist of post-setup tasks
