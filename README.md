# Hono Template — Project Setup Guide

---

## Prerequisites

- [Bun](https://bun.sh) v1.2+ (`powershell -c "irm bun.sh/install.ps1 | iex"`)
- Node.js 20+
- Docker Desktop (for local DB/Redis)

---

## 0. Scaffold Project

```bash
bun create hono@latest
cd <project-name>
git init
```

---

## 1. Code Quality

### Linting (oxlint)

```bash
bun add -d oxlint
```

Add to `package.json`:

```json
"lint": "oxlint",
"lint:fix": "oxlint --fix"
```

### Formatting (oxfmt)

```bash
bun add -d oxfmt
```

Add to `package.json`:

```json
"format": "oxfmt --write",
"format:check": "oxfmt --check"
```

### Type Checking

Add to `package.json`:

```json
"typecheck": "tsc --noEmit"
```

### Pre-commit Hooks

```bash
bun add -d husky lint-staged
bunx husky init
```

Add to `package.json`:

```json
"lint-staged": {
  "*.{ts,tsx}": [
    "bunx oxlint --fix",
    "bunx oxfmt --write"
  ],
  "*.{js,json,md,yml,yaml}": [
    "bunx oxfmt --write"
  ]
}
```

In `.husky/pre-commit`:

```bash
bun x lint-staged
```

---

## 2. Project Structure

```powershell
mkdir `
  .vscode, `
  src/api/v1, `
  src/api/v1/common, `
  src/core, `
  src/db/migrations, `
  src/db/models, `
  src/middleware, `
  src/types, `
  src/utils, `
  tests/unit, `
  tests/e2e, `
  .github/workflows
```

```powershell
ni -ItemType File -Path @(
  ".vscode/extensions.json"
  ".vscode/settings.json"
  ".github/workflows/ci.yml"
  ".env"
  ".env.example"
  ".env.test"
  "drizzle.config.ts"
  "TODO.md"
  "vercel.json"
  "vitest.config.ts"
  "Dockerfile"
  ".dockerignore"
  "docker-compose.yml"
  "docker-compose.prod.yml"
  "docker-compose.act.yml"

  "src/index.ts"
  "src/instrument.ts"
  "src/serve.ts"
  "src/serve-local.ts"

  "src/core/env.ts"
  "src/core/db.ts"
  "src/core/error-handlers.ts"
  "src/core/errors.ts"
  "src/core/logger.ts"
  "src/core/request-context.ts"
  "src/core/rate-limiter.ts"
  "src/core/redis.ts"
  "src/core/cache.ts"
  "src/core/openapi-config.ts"

  "src/api/v1/router.ts"

  "src/db/custom-types.ts"
  "src/db/enums.ts"
  "src/db/models/index.ts"
  "src/db/relations.ts"
  "src/db/seed.ts"

  "src/middleware/auth-middleware.ts"
  "src/middleware/request-context.ts"

  "tests/setup.ts"
)
```

---

## 3. Environment Variables

```bash
bun add zod dotenv
```

Define your validated schema in `src/core/env.ts` using Zod. Import it in `src/index.ts`.

---

## 4. Editor Setup

`.vscode/extensions.json`:

```json
{
  "recommendations": [
    "oven.bun-vscode",
    "ms-azuretools.vscode-containers",
    "cweijan.vscode-database-client2",
    "cweijan.dbclient-jdbc",
    "ms-azuretools.vscode-docker",
    "github.vscode-github-actions",
    "github.vscode-pull-request-github",
    "oxc.oxc-vscode",
    "vitest.explorer"
  ]
}
```

`.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "js/ts.tsdk.path": "node_modules/typescript/lib",
  "js/ts.tsdk.promptToUseWorkspaceVersion": true
}
```

---

## 5. Core Infrastructure

### Logging

```bash
bun add pino
bun add -d pino-pretty
```

Configure `src/core/logger.ts`. Use `pino-pretty` only in development.

### Request Context

Configure `src/core/request-context.ts`. Provides `AsyncLocalStorage`-based access to `requestId`, `correlationId`, and a scoped logger through `runWithRequestContext()`, `getLogger()`, `getRequestId()`, and `getCorrelationId()`.

### Error Handling

Create custom error classes in `src/core/errors.ts`. Wire up the error handler middleware in `src/core/error-handlers.ts` and register it in `src/index.ts`.

### Database

```bash
bun add drizzle-orm postgres @neondatabase/serverless
bun add -d drizzle-kit
```

The `@neondatabase/serverless` driver is required when using `drizzle-orm/neon-serverless` (see `src/core/db.ts`). Locally, the included `docker-compose.yml` runs a Neon-compatible HTTP proxy (`neon-proxy`) in front of Postgres, so no Neon account is needed for development.

Configure `src/core/db.ts` and `drizzle.config.ts`.

### Redis

Configure `src/core/redis.ts`.

### Rate Limiter

Configure `src/core/rate-limiter.ts`.

### Cache

```bash
bun add unstorage
```

Configure `src/core/cache.ts`.

### HTTP Client

```bash
bun add ofetch
```

### OpenAPI & API Docs

```bash
bun add @hono/standard-validator hono-openapi @scalar/hono-api-reference @scalar/openapi-to-markdown
```

Configure `src/core/openapi-config.ts`. Mount these endpoints using environment-guarded middleware (dev/test only):

| Endpoint    | Purpose                    |
| ----------- | -------------------------- |
| `/openapi`  | Raw OpenAPI spec           |
| `/docs`     | Scalar interactive docs UI |
| `/llms.txt` | LLM-friendly API summary   |

Wrap them behind a check like `if (env.APP_ENV !== "production")` so they're never exposed in production.

### Fern

Install the [Fern CLI](https://buildwithfern.com) and run `fern init` at the project root to define your API spec. Commit the generated `fern/` directory. Use `fern check` and `fern generate` to validate and publish docs.

```bash
bunx fern init
```

### Sentry / Error Monitoring

```bash
bun add @sentry/hono
```

> `@sentry/hono` requires `@sentry/node` as a peer dependency for the `/node` entry (used by `instrument.ts` and the error handler to call `Sentry.init` / `Sentry.captureException`). Install it alongside:
>
> ```bash
> bun add @sentry/node
> ```
>
> In `src/instrument.ts`, import from the platform-specific entry:
>
> ```ts
> import * as Sentry from "@sentry/hono/node";
> ```

Configure `src/instrument.ts` to initialize Sentry with your DSN, environment, and sample rate. Import it at the top of `src/index.ts` (before the Hono app is created) so startup errors are captured immediately.

---

## 6. App Entry Points

### `src/index.ts` — Main Application

This wires together all middleware, routes, error handling, and environment-guarded documentation endpoints.

### `src/serve.ts` — Server Bootstrap

The entry point that starts the HTTP server using `@hono/node-server`.

### `src/serve-local.ts` — Local Development

Sets sensible defaults for local services, then delegates to `serve.ts`.

---

### Running Everything with Concurrently

```bash
bun add -d concurrently
```

The following scripts manage the local dev environment:

| Script                | Description                                      |
| --------------------- | ------------------------------------------------ |
| `bun run dev`         | Starts Docker services + dev server concurrently |
| `bun run dev:docker`  | Start Postgres, Redis, and proxy containers      |
| `bun run dev:server`  | Start the dev server with hot-reload (tsx watch) |
| `bun run db:studio`   | Launch Drizzle Studio for DB inspection          |
| `bun run db:generate` | Generate SQL migration from schema changes       |
| `bun run db:migrate`  | Apply pending migrations to the database         |
| `bun run db:push`     | Push schema directly (dev only)                  |

Run `bun run dev` to bring up everything — Docker containers spin up in the background while the server starts with hot-reload.

---

## 7. Middleware

- **`request-context.ts`** — Injects `requestId`, `correlationId`, and a child logger into each request. Logs start/end with duration and status.
- **`auth-middleware.ts`** — Validates Better Auth session cookie, checks email verification and role-based permissions. Exports `buyer`, `seller`, `admin` presets.

---

## 8. Database Schema & Migrations

1. Define your data models in `src/db/models/`.
2. Set up relations in `src/db/relations.ts`.
3. Configure `drizzle.config.ts` with your DB URL.
4. Generate SQL: `db:generate` script.
5. Add any custom SQL.
6. Migrate: `db:migrate` script.
7. Create and run a seed script: `src/db/seed.ts`.

---

## 9. API Design

- Define your `v1` router in `src/api/v1/router.ts` — mount sub-routers per domain.
- Enforce consistent response envelopes: `{ data, meta? }` for success, `{ error }` for failure.
- Add a `/health` endpoint returning service status, version, and DB/Redis connectivity.

---

## 10. API Documentation & Project Docs

- Mount OpenAPI spec at `/openapi`.
- Mount Scalar docs UI at `/docs` for interactive API reference.
- Generate `/llms.txt` from your OpenAPI spec for LLM consumption.
- Set up [Fern](https://buildwithfern.com) for published API docs.
- Maintain a `CHANGELOG.md` for notable changes per version.
- Add `CONTRIBUTING.md` if the project is open to external contributions.
- Keep the project `README.md` updated with setup, usage, and architecture notes.
- Optionally configure [TypeDoc](https://typedoc.org/) for generated code docs.

---

## 11. Authentication (Better Auth)

This template uses [Better Auth](https://better-auth.com) — a framework-agnostic, TypeScript-first authentication library.

### Install

```bash
bun add better-auth
```

### Environment Variables

```env
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000
```

### Auth Instance

Create `src/utils/auth.ts` with the Drizzle adapter:

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../core/db.js";
import env from "../core/env.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  trustedOrigins: [env.BETTER_AUTH_URL],
});
```

### Mount Handler

In `src/index.ts`, Better Auth is mounted at `/api/auth/*` with CORS:

```ts
import { auth } from "./utils/auth.js";
import { cors } from "hono/cors";

app.use("/api/auth/*", cors({ origin: env.BETTER_AUTH_URL, credentials: true }));
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
```

### Auth Middleware

The middleware at `src/middleware/auth-middleware.ts` reads the session cookie via `auth.api.getSession()` and enforces role-based access. It exports three pre-configured guards:

| Guard    | Allowed Roles              |
| -------- | -------------------------- |
| `buyer`  | `buyer`, `seller`, `admin` |
| `seller` | `seller`, `admin`          |
| `admin`  | `admin`                    |

Usage in routes:

```ts
import { buyer } from "../middleware/auth-middleware.js";
router.get("/profile", buyer, handler);
```

> **Note:** The `role` field is expected on the user record. You can add it via a custom migration or use the [Better Auth `user` table customization](https://better-auth.com/docs/custom-fields).

### Generate Auth Schema

Better Auth needs its tables in your database. Run these CLI commands to generate the schema and apply it:

```bash
bunx @better-auth/cli@latest generate
bunx drizzle-kit push
```

### Client Setup (Frontend)

Install Better Auth on the frontend and create a client:

```ts
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();
```

### API Endpoints

Once mounted, Better Auth provides the following endpoints at `/api/auth/`:

| Method | Path            | Description                  |
| ------ | --------------- | ---------------------------- |
| POST   | `/signup/email` | Register with email/password |
| POST   | `/signin/email` | Sign in with email/password  |
| GET    | `/session`      | Get current session          |
| POST   | `/signout`      | Sign out                     |
| GET    | `/ok`           | Health check                 |

---

## 12. Testing

```bash
bun add -d vitest drizzle-seed
```

Configure `vitest.config.ts` and `tests/setup.ts`. Write unit tests in `tests/unit/` and e2e tests in `tests/e2e/`.

---

## 13. CI/CD

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run format:check
      - run: bun run typecheck
      - run: bun run test
      - run: bun run build
```

Add secrets to GitHub: `DATABASE_URL`, `REDIS_URL`, third-party API keys. Block direct pushes to `main`/`dev`; require CI to pass before merging.

---

## 14. Deployment

### Docker

Multi-stage `Dockerfile` (install → build → slim runtime). Production stack via `docker-compose.prod.yml`.

```bash
bun run docker:build    # build image
bun run docker:up       # start production stack (app + postgres + redis)
bun run docker:down     # stop production stack
```

Set production secrets in `.env.production` (git-ignored) before deploying.

### Serverless

For **Vercel** — configure `vercel.json` and link the repo. For **Cloudflare Workers** — use Hono's CF adapter.

### Operations

- Set up a health check endpoint for uptime monitoring.
- Configure log draining to Better Stack / Datadog / Logtail in production.
