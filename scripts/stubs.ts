export type Stub = { path: string; contents: string };

export const VSCODE_EXTENSIONS_JSON = `{
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
`;

export const VSCODE_SETTINGS_JSON = `{
  "editor.formatOnSave": true,
  "js/ts.tsdk.path": "node_modules/typescript/lib",
  "js/ts.tsdk.promptToUseWorkspaceVersion": true
}
`;

export const CI_YML = `name: CI
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
`;

export const ENV_FILE = `APP_ENV=development
LOG_LEVEL=info

# Database (local docker compose uses these defaults)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp

# Upstash-compatible Redis (local docker compose upstash-proxy on :8079)
UPSTASH_REDIS_REST_URL=http://localhost:8079
UPSTASH_REDIS_REST_TOKEN=local-dev-token

# Better Auth
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace-me-with-output-of-openssl-rand-base64-32

# Sentry (optional in dev)
SENTRY_DSN=
`;

export const ENV_EXAMPLE = `APP_ENV=development
LOG_LEVEL=info

DATABASE_URL=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

BETTER_AUTH_URL=
BETTER_AUTH_SECRET=

SENTRY_DSN=
`;

export const ENV_TEST = `APP_ENV=test
LOG_LEVEL=silent

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp_test

UPSTASH_REDIS_REST_URL=http://localhost:8079
UPSTASH_REDIS_REST_TOKEN=local-dev-token

BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=test-secret-test-secret-test-secret-1234

SENTRY_DSN=
`;

export const DRIZZLE_CONFIG_TS = `import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/models/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
});
`;

export const VERCEL_JSON = `{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "bunVersion": "1.x",
  "devCommand": "bun run src/serve.ts"
}
`;

export const VITEST_CONFIG_TS = `import dotenv from "dotenv";
import { defineConfig } from "vitest/config";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, ".env.test") });

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 60000,
    hookTimeout: 60000,
    pool: "forks",
  },
  resolve: {
    alias: {
      "#": path.resolve(__dirname, "src"),
    },
  },
});
`;

export const DOCKERFILE = `FROM oven/bun:1 AS install

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS build

WORKDIR /app
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1-slim

WORKDIR /app
COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

EXPOSE 3000

CMD ["bun", "run", "dist/serve.js"]
`;

export const DOCKERIGNORE = `node_modules
dist
.env
.env.*
.git
.gitignore
*.md
.vscode
.idea
.husky
tests
TODO.md
bun.lock
`;

export const DOCKER_COMPOSE_YML = `services:
  db:
    image: postgres:16-alpine
    container_name: my-db
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

  neon-proxy:
    image: ghcr.io/timowilhelm/local-neon-http-proxy:main
    container_name: my-neon-proxy
    restart: unless-stopped
    ports:
      - "4444:4444"
    environment:
      PG_CONNECTION_STRING: postgres://postgres:postgres@db:5432/myapp
    depends_on:
      db:
        condition: service_healthy

  redis:
    image: redis:7-alpine
    container_name: my-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  upstash-proxy:
    image: hiett/serverless-redis-http:latest
    container_name: my-upstash-proxy
    restart: unless-stopped
    ports:
      - "8079:80"
    environment:
      SRH_MODE: env
      SRH_TOKEN: local-dev-token
      SRH_CONNECTION_STRING: redis://redis:6379
    depends_on:
      redis:
        condition: service_healthy

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: my-cloudflared
    restart: unless-stopped
    extra_hosts:
      - "host.docker.internal:host-gateway"
    command: tunnel --url http://host.docker.internal:3000

volumes:
  pgdata:
  redisdata:
`;

export const DOCKER_COMPOSE_PROD_YML = `services:
  app:
    build: .
    container_name: my-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    container_name: my-db
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: myapp
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: my-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
  redisdata:
`;

export const DOCKER_COMPOSE_ACT_YML = `services:
  act:
    image: ghcr.io/catthehacker/ubuntu:act-latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - .:/workspace
    working_dir: /workspace
    entrypoint:
      [
        "/bin/bash",
        "-lc",
        "curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash && /workspace/bin/act \${ACT_ARGS:-}",
      ]
`;

export const TODO_MD = `# TODO

## Immediate

- [ ] Set production \`BETTER_AUTH_SECRET\` (run: \`openssl rand -base64 32\`)
- [ ] Configure \`SENTRY_DSN\` if using Sentry
- [ ] Replace \`my-api\` / \`my-app\` / \`mydb\` placeholders with your project names
- [ ] Define your first domain models under \`src/db/models/\`
- [ ] Add your first route under \`src/api/v1/\`
- [ ] Update \`src/core/openapi-config.ts\` (title, version, server URLs)
- [ ] Update \`service\` field in \`src/core/logger.ts\`

## Optional

- [ ] Run \`bunx fern init\` to set up API docs publishing
- [ ] Run \`bunx @better-auth/cli@latest generate\` to refresh auth schema
- [ ] Add a \`CHANGELOG.md\`
- [ ] Add a \`CONTRIBUTING.md\`
- [ ] Configure TypeDoc for generated code docs
`;

export const HUSKY_PRE_COMMIT = `bun x lint-staged
`;

export const SRC_INSTRUMENT_TS = `import * as Sentry from "@sentry/hono/node";
import env from "./core/env.js";
import { logger } from "./core/logger.js";

let initialized = false;
if (!initialized) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.APP_ENV,
    tracesSampleRate: env.APP_ENV === "production" ? 0.2 : 1.0,
    enabled: env.APP_ENV === "production" || !!env.SENTRY_DSN,
  });
  initialized = true;
}

logger.info({ dsn: env.SENTRY_DSN ? "configured" : "not set" }, "Sentry initialized");
`;

export const SRC_SERVE_TS = `import { serve } from "@hono/node-server";
import app from "./index.js";

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(\`Server listening on http://localhost:\${info.port}\`);
});
`;

export const SRC_SERVE_LOCAL_TS = `process.env.API_BASE_URL ||= "http://localhost:3000";
process.env.DATABASE_URL ||= "postgresql://postgres:postgres@localhost:5432/mydb";
process.env.REDIS_URL ||= "redis://localhost:6379";
process.env.APP_ENV ||= "development";

await import("./serve.js");
`;

export const SRC_INDEX_TS = `import "./core/env.js";
import "./instrument.js";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { describeRoute, openAPIRouteHandler, resolver } from "hono-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { createMarkdownFromOpenApi } from "@scalar/openapi-to-markdown";

import { globalRatelimit } from "./core/rate-limiter.js";
import { onErrorHandler } from "./core/error-handlers.js";
import { requestLifecycle } from "./middleware/request-context.js";
import v1Router from "./api/v1/router.js";
import { auth } from "./utils/auth.js";
import type { Logger } from "pino";
import { z } from "zod";
import env from "./core/env.js";
import { openapiDocumentation } from "./core/openapi-config.js";

export type Variables = {
  requestId: string;
  correlationId: string;
  logger: Logger;
  user?: typeof auth.$Infer.Session.user | null;
  session?: typeof auth.$Infer.Session.session | null;
};

const app = new Hono<{ Variables: Variables }>();

app.use(requestLifecycle);

app.use(globalRatelimit);

app.use(
  "/api/auth/*",
  cors({
    origin: env.BETTER_AUTH_URL,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

if (env.APP_ENV !== "production" || process.env.VERCEL) {
  app.get(
    "/openapi",
    openAPIRouteHandler(app, {
      documentation: openapiDocumentation,
    }),
  );

  app.get(
    "/docs",
    Scalar({
      url: "/openapi",
      pageTitle: "API Docs",
      theme: "default",
      proxyUrl: "https://proxy.scalar.com",
      authentication: {
        preferredSecurityScheme: "bearerAuth",
        securitySchemes: {
          bearerAuth: {
            token: "",
          },
        },
      },
    }),
  );

  app.get("/llms.txt", async (c) => {
    const response = await fetch(\`\${c.req.url.split("/llms.txt")[0]}/openapi\`);
    const openapiJson = await response.json();
    const markdown = await createMarkdownFromOpenApi(JSON.stringify(openapiJson));
    return c.text(markdown);
  });
}

app.onError(onErrorHandler);

app.notFound((c) => {
  return c.json(
    {
      error: { code: "not_found", message: "Not Found", path: c.req.path },
    },
    404,
  );
});

const healthResponseSchema = z.object({ status: z.string() });
app.get(
  "/health",
  describeRoute({
    tags: ["Health"],
    summary: "Health check",
    security: [],
    responses: {
      200: {
        description: "Server is healthy",
        content: {
          "application/json": { schema: resolver(healthResponseSchema) },
        },
      },
    },
  }),
  (c) => c.json({ status: "ok" }),
);

app.route("/api/v1", v1Router);

export default app;
`;

export const SRC_CORE_ENV_TS = `import "dotenv/config";
import { z } from "zod/v4";

const baseSchema = z.object({
  APP_ENV: z.enum(["development", "production", "test"]).default("development"),

  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

  DATABASE_URL: z.string(),

  UPSTASH_REDIS_REST_URL: z.string(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  SENTRY_DSN: z.string().optional(),
});

const env = baseSchema.parse(process.env);

export default env;
`;

export const SRC_CORE_DB_TS = `import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { relations } from "../db/relations.js";
import env from "./env.js";

if (env.APP_ENV === "development" && !process.env.VERCEL) {
  neonConfig.wsProxy = (host: string, port: string | number) => \`\${host}:\${port}/v2\`;
  neonConfig.useSecureWebSocket = false;
}

const client = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle({ client, schema: relations });
`;

export const SRC_CORE_REDIS_TS = `import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();
`;

export const SRC_CORE_CACHE_TS = `import { redis } from "./redis.js";

const BASE = "cache:";
const DEFAULT_TTL = 3600;

const prefix = (k: string) => \`\${BASE}\${k}\`;

export const cache = {
  async get<T = unknown>(k: string): Promise<T | null> {
    return redis.get<T>(prefix(k));
  },
  async set<T>(k: string, value: T, opts?: { ex?: number }): Promise<void> {
    const ttl = opts?.ex ?? DEFAULT_TTL;
    await redis.set(prefix(k), value, { ex: ttl });
  },
  async del(k: string): Promise<void> {
    await redis.del(prefix(k));
  },
};
`;

export const SRC_CORE_RATE_LIMITER_TS = `import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis.js";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { Variables } from "../index.js";
import { badRequestError, rateLimitedError } from "./errors.js";
import { differenceInSeconds } from "date-fns";

type RateLimitKeyExtractor = (c: Context<{ Variables: Variables }>) => string;

interface RateLimitOptions {
  limit: number;
  window: number;
  key?: "ip" | "userId" | RateLimitKeyExtractor;
  prefix?: string;
}

export function createRatelimit(opts: RateLimitOptions) {
  const { limit, window, key = "ip", prefix = "ratelimit" } = opts;

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, \`\${window}s\`),
    analytics: true,
    prefix,
  });

  const extractKey: RateLimitKeyExtractor =
    key === "ip"
      ? (c) => c.req.header("x-forwarded-for") ?? "unknown"
      : key === "userId"
        ? (c) => {
            const user = c.get("user");
            if (!user?.id)
              throw badRequestError(
                "user not set — ensure auth middleware runs before rate limiter",
              );
            return user.id;
          }
        : key;

  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const identifier = extractKey(c);
    const { success, remaining, limit: rateLimit, reset } = await ratelimit.limit(identifier);

    c.header("X-RateLimit-Limit", String(rateLimit));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(reset));

    if (!success) {
      const retryAfter = Math.max(
        1,
        differenceInSeconds(reset, Date.now(), { roundingMethod: "ceil" }),
      );
      throw rateLimitedError(retryAfter, rateLimit, window, "Rate limit exceeded");
    }

    await next();
  });
}

export const globalRatelimit = createRatelimit({
  limit: 300,
  window: 60,
  key: "ip",
  prefix: "ratelimit",
});
`;

export const SRC_CORE_LOGGER_TS = `import pino from "pino";
import env from "./env.js";

const isPrettyLoggingEnabled = env.APP_ENV === "development" && !process.env.VERCEL;

export const logger = pino({
  level: env.LOG_LEVEL,

  base: {
    service: "my-api",
    env: env.APP_ENV,
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['set-cookie']",
      "*.password",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
      "*.secret",
      "*.apiKey",
    ],
    censor: "[REDACTED]",
  },

  serializers: {
    err: pino.stdSerializers.err,
  },

  ...(isPrettyLoggingEnabled
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname,service,env",
          },
        },
      }
    : {}),
});
`;

export const SRC_CORE_REQUEST_CONTEXT_TS = `import { AsyncLocalStorage } from "node:async_hooks";
import type { Logger } from "pino";
import { logger as rootLogger } from "../core/logger.js";

type RequestContext = {
  requestId: string;
  correlationId: string;
  logger: Logger;
};

const requestContext = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return requestContext.run(context, fn);
}

export function getRequestContext() {
  return requestContext.getStore();
}

export function getLogger() {
  return requestContext.getStore()?.logger ?? rootLogger;
}

export function getRequestId() {
  return requestContext.getStore()?.requestId;
}

export function getCorrelationId() {
  return requestContext.getStore()?.correlationId;
}
`;

export const SRC_CORE_ERRORS_TS = `import type { ContentfulStatusCode } from "hono/utils/http-status";
import z, { ZodError } from "zod";

export type ErrorCode =
  | "bad_request"
  | "validation_error"
  | "unauthorized"
  | "permission_denied"
  | "not_found"
  | "conflict"
  | "rate_limit_exceeded"
  | "external_service_error"
  | "internal_error";

export class AppError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: ErrorCode;
  readonly meta?: Record<string, unknown>;
  readonly headers?: Record<string, string>;
  readonly expose: boolean;
  readonly retryable: boolean;

  constructor(params: {
    status: ContentfulStatusCode;
    code: ErrorCode;
    message: string;
    meta?: Record<string, unknown>;
    headers?: Record<string, string>;
    expose?: boolean;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(params.message, { cause: params.cause });
    this.name = "AppError";
    this.status = params.status;
    this.code = params.code;
    this.meta = params.meta;
    this.headers = params.headers;
    this.expose = params.expose ?? true;
    this.retryable = params.retryable ?? false;
  }
}

export const badRequestError = (message = "Bad request", meta?: Record<string, unknown>) =>
  new AppError({
    status: 400,
    code: "bad_request",
    message,
    meta,
  });

export const validationError = (message = "Validation failed", meta?: Record<string, unknown>) =>
  new AppError({
    status: 422,
    code: "validation_error",
    message,
    meta,
  });

export const unauthorizedError = (message = "Unauthorized") =>
  new AppError({
    status: 401,
    code: "unauthorized",
    message,
    headers: { "WWW-Authenticate": "Bearer" },
  });

export const permissionDeniedError = (message = "Permission denied") =>
  new AppError({
    status: 403,
    code: "permission_denied",
    message,
  });

export const notFoundError = (message = "Resource not found") =>
  new AppError({
    status: 404,
    code: "not_found",
    message,
  });

export const conflictError = (message = "Conflict", meta?: Record<string, unknown>) =>
  new AppError({
    status: 409,
    code: "conflict",
    message,
    meta,
  });

export const rateLimitedError = (
  retryAfter: number,
  limit: number,
  windowSeconds: number,
  message = "Rate limit exceeded",
) =>
  new AppError({
    status: 429,
    code: "rate_limit_exceeded",
    message,
    headers: { "Retry-After": String(retryAfter) },
    meta: { retry_after: retryAfter, limit, window_seconds: windowSeconds },
  });

export const externalServiceError = (
  message = "External service error",
  meta?: Record<string, unknown>,
) =>
  new AppError({
    status: 502,
    code: "external_service_error",
    message,
    meta,
    retryable: true,
  });

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPgUniqueViolation(error: unknown): boolean {
  return isObject(error) && error.code === "23505";
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return validationError("Validation failed", {
      issues: z.treeifyError(error),
    });
  }

  if (isPgUniqueViolation(error)) {
    return conflictError("Resource already exists");
  }

  return new AppError({
    status: 500,
    code: "internal_error",
    message: "Internal server error",
    expose: false,
    cause: error,
  });
}

export function serializeError(error: AppError, requestId?: string) {
  return {
    error: {
      code: error.code,
      message: error.expose ? error.message : "Internal server error",
      request_id: requestId,
      meta: error.meta,
    },
  };
}
`;

export const SRC_CORE_ERROR_HANDLERS_TS = `import * as Sentry from "@sentry/hono/node";
import type { Context } from "hono";

import { normalizeError, serializeError } from "./errors.js";
import type { Variables } from "../index.js";

export function onErrorHandler(error: unknown, c: Context<{ Variables: Variables }>) {
  const err = normalizeError(error);
  const requestId = c.get("requestId");
  const log = c.get("logger");

  log.error(
    {
      err: error,
      code: err.code,
      status: err.status,
      retryable: err.retryable,
    },
    err.message,
  );

  if (err.status >= 500) {
    Sentry.captureException(error);
  }

  for (const [key, value] of Object.entries(err.headers ?? {})) {
    c.header(key, value);
  }

  return c.json(serializeError(err, requestId), err.status);
}
`;

export const SRC_CORE_OPENAPI_CONFIG_TS = `const port = Number(process.env.PORT) || 3000;
const localServerUrl = \`http://localhost:\${port}\`;

export const openapiDocumentation = {
  info: {
    title: "My API",
    version: "1.0.0",
    description: "My API Documentation",
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http" as const,
        scheme: "bearer",
      },
    },
  },
  security: [{ bearerAuth: [] }],
  servers: [
    { url: localServerUrl, description: "Local Server" },
    { url: "https://my-api.vercel.app/", description: "Test Server" },
  ],
};
`;

export const SRC_MIDDLEWARE_AUTH_MIDDLEWARE_TS = `import { createMiddleware } from "hono/factory";
import { unauthorizedError, permissionDeniedError } from "../core/errors.js";
import { auth } from "../utils/auth.js";
import type { Variables } from "../index.js";

export function authMiddleware(allowedRoles?: string[]) {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) throw unauthorizedError("Not authenticated");
    if (!session.user.emailVerified)
      throw permissionDeniedError("Email not verified. Please verify your email first.");

    const role = (session.user as Record<string, unknown>).role as string | undefined;

    if (allowedRoles?.length && (!role || !allowedRoles.includes(role)))
      throw permissionDeniedError("Insufficient permissions");

    c.set("user", session.user);
    c.set("session", session.session);
    await next();
  });
}

export const buyer = authMiddleware(["buyer", "seller", "admin"]);
export const seller = authMiddleware(["seller", "admin"]);
export const admin = authMiddleware(["admin"]);
`;

export const SRC_MIDDLEWARE_REQUEST_CONTEXT_TS = `import { logger } from "../core/logger.js";
import { createMiddleware } from "hono/factory";
import type { Variables } from "../index.js";
import { routePath } from "hono/route";
import { runWithRequestContext } from "../core/request-context.js";

export const requestLifecycle = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  const correlationId = c.req.header("x-correlation-id") ?? requestId;
  const childLogger = logger.child({ requestId, correlationId });

  c.set("requestId", requestId);
  c.set("correlationId", correlationId);
  c.set("logger", childLogger);

  const method = c.req.method;
  const url = c.req.url;
  const path = c.req.path;
  const start = performance.now();

  childLogger.info({ method, url, path }, "Request started");

  return runWithRequestContext({ requestId, correlationId, logger: childLogger }, async () => {
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
});
`;

export const SRC_API_V1_ROUTER_TS = `import { Hono } from "hono";

const v1Router = new Hono();

export default v1Router;
`;

export const SRC_DB_CUSTOM_TYPES_TS = `// Custom Drizzle column types — extend here as needed.
export {};
`;

export const SRC_DB_ENUMS_TS = `// pg enums — define with pgEnum and re-export from here.
export {};
`;

export const SRC_DB_MODELS_INDEX_TS = `export {};
`;

export const SRC_DB_RELATIONS_TS = `export const relations: Record<string, unknown> = {};
`;

export const SRC_DB_SEED_TS = `// import { reset, seed } from "drizzle-seed";
// import { db } from "../core/db.js";
//
// async function main() {
//   await reset(db, { /* tables */ });
//   await seed(db, { /* tables */ }).refine(() => ({ /* ... */ }));
//
//   console.log("Seed complete");
//   process.exit(0);
// }
//
// main().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });
export {};
`;

export const SRC_UTILS_AUTH_TS = `import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../core/db.js";
import env from "../core/env.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  trustedOrigins: [env.BETTER_AUTH_URL],
});
`;

export const TESTS_SETUP_TS = `// Vitest setup — runs before each test file.
// Add global mocks, env, or DB cleanup hooks here.
export {};
`;

export const FERN_CONFIG_JSON = `{
  "organization": "personal",
  "version": "5.44.11"
}
`;

export const FERN_GENERATORS_YML = `# yaml-language-server: $schema=https://schema.buildwithfern.dev/generators-yml.json
api:
  specs:
    - openapi: openapi.yml
default-group: local
groups:
  local:
    generators:
      - name: fern-typescript-sdk
        output:
          location: local-file-system
          path: ../sdks/typescript
        version: 3.71.4
`;

export const FERN_OPENAPI_YML = `openapi: 3.0.3
info:
  title: Petstore API
  version: 1.0.0
  description: A sample API for managing pets.

paths:
  /pets:
    get:
      summary: List all pets
      operationId: listPets
      tags:
        - pets
      parameters:
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            format: int32
            maximum: 100
          description: Maximum number of pets to return.
      responses:
        "200":
          description: A list of pets.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Pet"
        default:
          description: Unexpected error.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
    post:
      summary: Create a pet
      operationId: createPet
      tags:
        - pets
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreatePetRequest"
      responses:
        "201":
          description: The created pet.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Pet"
        default:
          description: Unexpected error.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
  /pets/{petId}:
    get:
      summary: Get a pet by ID
      operationId: getPet
      tags:
        - pets
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: string
          description: The ID of the pet to retrieve.
      responses:
        "200":
          description: The requested pet.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Pet"
        default:
          description: Unexpected error.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"

components:
  schemas:
    Pet:
      type: object
      required:
        - id
        - name
      properties:
        id:
          type: string
          description: Unique identifier for the pet.
        name:
          type: string
          description: Name of the pet.
        tag:
          type: string
          description: Optional tag for the pet.
    CreatePetRequest:
      type: object
      required:
        - name
      properties:
        name:
          type: string
          description: Name of the pet.
        tag:
          type: string
          description: Optional tag for the pet.
    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: integer
          format: int32
          description: Error code.
        message:
          type: string
          description: Error message.
`;

export const PACKAGE_JSON_PATCH = {
  scripts: {
    lint: "oxlint",
    "lint:fix": "oxlint --fix",
    format: "oxfmt --write",
    "format:check": "oxfmt --check",
    typecheck: "tsc --noEmit",
    prepare: "husky",
    "dev:docker": "docker compose up -d",
    "dev:server": "tsx watch src/serve-local.ts",
    dev: 'concurrently -n docker,server -c cyan,green "bun run dev:docker" "bun run dev:server"',
    build: "tsc",
    "docker:build": "docker compose -f docker-compose.prod.yml build",
    "docker:up": "docker compose -f docker-compose.prod.yml up -d",
    "docker:down": "docker compose -f docker-compose.prod.yml down",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "bun run src/db/seed.ts",
    test: "vitest run --passWithNoTests",
    "test:watch": "vitest",
    setup: "bun scripts/setup.ts",
  },
  "lint-staged": {
    "*.{ts,tsx}": ["bunx oxlint --fix", "bunx oxfmt --write"],
    "*.{js,json,md,yml,yaml}": ["bunx oxfmt --write"],
  },
};

export const DEPENDENCIES = {
  runtime: [
    "@hono/node-server",
    "@hono/standard-validator",
    "@neondatabase/serverless",
    "@scalar/hono-api-reference",
    "@scalar/openapi-to-markdown",
    "@sentry/hono",
    "@sentry/node",
    "@upstash/ratelimit",
    "@upstash/redis",
    "better-auth",
    "date-fns",
    "dotenv",
    "drizzle-orm",
    "hono",
    "hono-openapi",
    "ofetch",
    "pino",
    "postgres",
    "unstorage",
    "zod",
  ] as const,
  dev: [
    "@types/node",
    "concurrently",
    "drizzle-kit",
    "drizzle-seed",
    "husky",
    "lint-staged",
    "oxfmt",
    "oxlint",
    "pino-pretty",
    "tsx",
    "typescript",
    "vitest",
  ] as const,
};

export const STUB_MANIFEST: Stub[] = [
  { path: ".vscode/extensions.json", contents: VSCODE_EXTENSIONS_JSON },
  { path: ".vscode/settings.json", contents: VSCODE_SETTINGS_JSON },
  { path: ".github/workflows/ci.yml", contents: CI_YML },
  { path: ".env", contents: ENV_FILE },
  { path: ".env.example", contents: ENV_EXAMPLE },
  { path: ".env.test", contents: ENV_TEST },
  { path: ".dockerignore", contents: DOCKERIGNORE },
  { path: "Dockerfile", contents: DOCKERFILE },
  { path: "docker-compose.yml", contents: DOCKER_COMPOSE_YML },
  { path: "docker-compose.prod.yml", contents: DOCKER_COMPOSE_PROD_YML },
  { path: "docker-compose.act.yml", contents: DOCKER_COMPOSE_ACT_YML },
  { path: "drizzle.config.ts", contents: DRIZZLE_CONFIG_TS },
  { path: "vercel.json", contents: VERCEL_JSON },
  { path: "vitest.config.ts", contents: VITEST_CONFIG_TS },
  { path: "TODO.md", contents: TODO_MD },
  { path: ".husky/pre-commit", contents: HUSKY_PRE_COMMIT },
  { path: "src/instrument.ts", contents: SRC_INSTRUMENT_TS },
  { path: "src/serve.ts", contents: SRC_SERVE_TS },
  { path: "src/serve-local.ts", contents: SRC_SERVE_LOCAL_TS },
  { path: "src/index.ts", contents: SRC_INDEX_TS },
  { path: "src/core/env.ts", contents: SRC_CORE_ENV_TS },
  { path: "src/core/db.ts", contents: SRC_CORE_DB_TS },
  { path: "src/core/redis.ts", contents: SRC_CORE_REDIS_TS },
  { path: "src/core/cache.ts", contents: SRC_CORE_CACHE_TS },
  { path: "src/core/rate-limiter.ts", contents: SRC_CORE_RATE_LIMITER_TS },
  { path: "src/core/logger.ts", contents: SRC_CORE_LOGGER_TS },
  { path: "src/core/request-context.ts", contents: SRC_CORE_REQUEST_CONTEXT_TS },
  { path: "src/core/errors.ts", contents: SRC_CORE_ERRORS_TS },
  { path: "src/core/error-handlers.ts", contents: SRC_CORE_ERROR_HANDLERS_TS },
  { path: "src/core/openapi-config.ts", contents: SRC_CORE_OPENAPI_CONFIG_TS },
  { path: "src/middleware/auth-middleware.ts", contents: SRC_MIDDLEWARE_AUTH_MIDDLEWARE_TS },
  { path: "src/middleware/request-context.ts", contents: SRC_MIDDLEWARE_REQUEST_CONTEXT_TS },
  { path: "src/api/v1/router.ts", contents: SRC_API_V1_ROUTER_TS },
  { path: "src/db/custom-types.ts", contents: SRC_DB_CUSTOM_TYPES_TS },
  { path: "src/db/enums.ts", contents: SRC_DB_ENUMS_TS },
  { path: "src/db/models/index.ts", contents: SRC_DB_MODELS_INDEX_TS },
  { path: "src/db/relations.ts", contents: SRC_DB_RELATIONS_TS },
  { path: "src/db/seed.ts", contents: SRC_DB_SEED_TS },
  { path: "src/utils/auth.ts", contents: SRC_UTILS_AUTH_TS },
  { path: "tests/setup.ts", contents: TESTS_SETUP_TS },
  { path: "fern/fern.config.json", contents: FERN_CONFIG_JSON },
  { path: "fern/generators.yml", contents: FERN_GENERATORS_YML },
  { path: "fern/openapi.yml", contents: FERN_OPENAPI_YML },
];
