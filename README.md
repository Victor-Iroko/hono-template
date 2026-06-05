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
bunx husky init
bun add -d lint-staged
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
  ".github/workflows/ci.yml"
  ".env"
  ".env.example"
  ".env.test"
  "drizzle.config.ts"
  "TODO.md"
  "vercel.json"
  "vitest.config.ts"
  "docker-compose.yml"
  "docker-compose.act.yml"

  "src/index.ts"
  "src/instrument.ts"
  "src/serve.ts"

  "src/core/env.ts"
  "src/core/db.ts"
  "src/core/error-handlers.ts"
  "src/core/errors.ts"
  "src/core/logger.ts"
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

Define your validated schema in `src/core/env.ts` using Zod. Import it in `src/serve.ts`.

Create `.env` (git-ignored), `.env.example`, and `.env.test`.

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
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
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

### Error Handling

Create custom error classes in `src/core/errors.ts`. Wire up the error handler middleware in `src/core/error-handlers.ts` and register it in `src/index.ts`.

### Database

```bash
bun add drizzle-orm postgres
bun add -d drizzle-kit
```

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
bun add @hono/standard-validator hono-openapi @scalar/hono-api-reference
```

Configure `src/core/openapi-config.ts`. Mount these endpoints using environment-guarded middleware (dev/test only):

| Endpoint           | Purpose                       |
|--------------------|-------------------------------|
| `/openapi.json`    | Raw OpenAPI spec              |
| `/docs`            | Scalar interactive docs UI    |
| `/llms.txt`        | LLM-friendly API summary      |

Wrap them behind a check like `if (env.NODE_ENV !== "production")` so they're never exposed in production.

### Fern

Install the [Fern CLI](https://buildwithfern.com) and run `fern init` at the project root to define your API spec. Commit the generated `fern/` directory. Use `fern check` and `fern generate` to validate and publish docs.

```bash
bunx fern init
```

---

## 6. Middleware

- **`request-context.ts`** — Injects `requestId`, `correlationId`, and a child logger into each request. Logs start/end with duration and status.
- **`auth-middleware.ts`** — Validates Bearer JWT, checks email verification and role-based permissions. Exports `buyer`, `seller`, `admin` presets.

---

## 7. Database Schema & Migrations

1. Define your data models in `src/db/models/`.
2. Set up relations in `src/db/relations.ts`.
3. Configure `drizzle.config.ts` with your DB URL.
4. Generate SQL: `db:generate` script.
5. Add any custom SQL.
6. Migrate: `db:migrate` script.
7. Create and run a seed script: `src/db/seed.ts`.

---

## 8. API Design

- Define your `v1` router in `src/api/v1/router.ts` — mount sub-routers per domain.
- Enforce consistent response envelopes: `{ data, meta? }` for success, `{ error }` for failure.
- Add a `/health` endpoint returning service status, version, and DB/Redis connectivity.

---

## 9. API Documentation & Project Docs

- Mount OpenAPI spec at `/openapi.json`.
- Mount Scalar docs UI at `/docs` for interactive API reference.
- Maintain a `CHANGELOG.md` for notable changes per version.
- Add `CONTRIBUTING.md` if the project is open to external contributions.
- Keep the project `README.md` updated with setup, usage, and architecture notes.
- Optionally configure [TypeDoc](https://typedoc.org/) for generated code docs.

---

## 10. Authentication

Create your auth logic in `src/api/v1/auth/` — JWT signing/verification, password hashing, email verification flows, role-based access.

---

## 11. Testing

```bash
bun add -d vitest
```

Configure `vitest.config.ts` and `tests/setup.ts`. Write unit tests in `tests/unit/` and e2e tests in `tests/e2e/`.

---

## 12. CI/CD

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

## 13. Deployment

### Docker

Create a multi-stage `Dockerfile` (install → build → slim runtime). Add `docker-compose.prod.yml` for self-hosting.

### Serverless

For **Vercel** — configure `vercel.json` and link the repo. For **Cloudflare Workers** — use Hono's CF adapter.

### Operations

- Set up a health check endpoint for uptime monitoring.
- Configure log draining to Better Stack / Datadog / Logtail in production.
