- Initialize Project
    - `bun create hono@latest`
- Setup Linting, formatting, Typechecking, Lint staged, & Precommits
    - Install dependencies
        
        ```jsx
        bun add -d oxlint oxfmt lint-staged
        ```
        
    - Add scripts to `package.json` — `lint`, `lint:fix`, `format`, `format:fix`
        
        ```jsx
        "lint": "oxlint",
        "lint:fix": "oxlint --fix",
        "format": "oxfmt --write",
        "format:check": "oxfmt --check",
        "typecheck": "tsc --noEmit",
        ```
        
    - Add lint staged to `package.json`
        
        ```jsx
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
        
    - Initialize Husky
        
        ```jsx
        bunx husky init
        ```
        
    - Add lint staged to `pre-commit`
        
        ```jsx
        bun x lint-staged
        ```
        
- Create folder structure
    
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
      ".gitignore"
      "drizzle.config.ts"
      "TODO.md"
      "tsconfig.json"
      "vercel.json"
      "vitest.config.ts"
      "package.json"
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
    
- Configure core dependencies
    - Environment variable validation
        - Install dependencies
            
            ```jsx
            bun add zod dotenv
            ```
            
        - Define your schema in `src/core/env.ts` and validate the `process.env`
        - Import it in `src/serve.ts`
    - Logging
        - Install dependencies
            
            ```jsx
            bun add pino
            ```
            
            ```jsx
            bun add -d pino-pretty
            ```
            
        - Configure your base logger in `src/core/logger.ts` where `pino-pretty` only appears in development scenarios.
    - Errors
        - Create your error class and all your error functions in `src/core/errors.ts`
    - Error Handler
        - Configure your error handler in `src/core/error-handler` and add it to `src/index.ts`.
    - Database in `src/core/db.ts`
    - Redis
    - Rate limiter
    - Cache

- Recommend VSCode extensions (`/.vscode/extensions.json`)
- Setup Any Project settings (`/.vscode/settings.json`)

- Install Dependencies
    
    ```powershell
    bun add @hono/standard-validator hono-openapi @scalar/hono-api-reference drizzle-orm unstorage ofetch postgres
    ```
    
    ```powershell
    bun add -d  drizzle-kit drizzle-seed concurrently  vitest
    ```
    

---

### Middlewares

- `request-context.ts`
    
    ```tsx
    import { logger } from "../core/logger.ts";
    import { createMiddleware } from "hono/factory";
    import type { Variables } from "../index.ts";
    import { routePath } from "hono/route";
    
    export const requestLifecycle = createMiddleware<{ Variables: Variables }>(async (c, next) => {
      const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
      const correlationId = c.req.header("x-correlation-id") ?? requestId;
      const childLogger = logger.child({ requestId, correlationId });
    
      c.set("requestId", requestId);
      c.set("correlationId", correlationId);
    
      const method = c.req.method;
      const url = c.req.url;
      const path = c.req.path;
      const start = performance.now();
    
      childLogger.info({ method, url, path }, "Request started");
    
      c.set("logger", childLogger);
    
      try {
        await next();
      } catch (err) {
        childLogger.error({ err, method, url, path }, "Unhandled request error");
        throw err;
      } finally {
        const durationMs = performance.now() - start;
        const status = c.res.status;
        const route = routePath(c) || path;
        childLogger.info(
          {
            method,
            url,
            path,
            route,
            status,
            durationMs: Math.round(durationMs * 100) / 100,
          },
          "Request completed",
        );
        c.header("x-request-id", requestId);
        c.header("x-correlation-id", correlationId);
      }
    });
    
    ```
    
- `auth-middleware.ts`
    
    ```tsx
    import { createMiddleware } from "hono/factory";
    import { unauthorizedError, permissionDeniedError } from "#/core/errors.js";
    import { verifyToken, type JwtPayload } from "../api/v1/auth/utils.ts";
    import type { Variables } from "#/index.ts";
    
    export function authMiddleware(allowedRoles?: string[]) {
      return createMiddleware<{ Variables: Variables }>(async (c, next) => {
        const header = c.req.header("Authorization");
        if (!header?.startsWith("Bearer "))
          throw unauthorizedError("Missing or invalid Authorization header");
    
        const token = header.slice(7);
    
        let payload: JwtPayload;
        try {
          payload = await verifyToken(token, "access");
        } catch {
          throw unauthorizedError("Invalid or expired token");
        }
    
        if (!payload.is_email_verified)
          throw permissionDeniedError("Email not verified. Please verify your email first.");
    
        if (allowedRoles?.length && !allowedRoles.includes(payload.role))
          throw permissionDeniedError("Insufficient permissions");
    
        c.set("user", payload);
        await next();
      });
    }
    
    export const buyer = authMiddleware(["buyer", "seller", "admin"]);
    export const seller = authMiddleware(["seller", "admin"]);
    export const admin = authMiddleware(["admin"]);
    
    ```
    

### Services

Configure your third party services in `src/utils` e.g. emai, payments, queues, image uploads, sentry, etc.

### Define your Datamodel and run your migration

- Define your data model and relations in `src/db`
- Configure `drizzle.config.ts`
- Generate your sql `db:generate`
- Add any custom sql
- Migrate to your database: `db:migrate`
- Create a seed script: `src/db/seed.ts`

### Auth

Create your auth stuff either in `src/api/v1/auth` or through a framework or provider.

### **Testing**

Configure your vitest.config.ts and tests/setup.ts

---

### **API Design & Documentation**

- Define your `v1` router in `src/api/v1/router.ts` — mount sub-routers per domain
- Mount OpenAPI spec at `/openapi.json` and Scalar docs UI at `/docs`
- Enforce consistent response envelopes: `{ data, meta? }` for success, `{ error }` for failure
- Add a `/health` endpoint returning service status, version, and DB/Redis connectivity

---

### **CI/CD**

- **GitHub Actions** (`/.github/workflows/ci.yml`): lint, format check, type-check, test, build — on push and PRs to `main`/`dev`
- Add secrets to GitHub: `DATABASE_URL`, `REDIS_URL`, third-party API keys, etc.
- **Branch rules:** block direct pushes to `main`/`dev`; require CI to pass before merging

---

### **Deployment**

- Choose hosting:  Vercel, or Cloudflare Workers (if using Hono's CF adapter)
- Create a production `Dockerfile` (multi-stage build: install → build → slim runtime image)
- Add `docker-compose.prod.yml` if self-hosting
- Link repo, add environment variables, trigger initial deploy
- Set up health check endpoint for the platform's uptime monitoring
- Configure log draining to Better Stack / Datadog / Logtail in production

---