import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runInstallers } from "../src/installers/index.js";
import { fileExists, readFileSafe } from "../src/utils/fs.js";
import { readPackageJson } from "../src/utils/pkg-json.js";

describe("End-to-End Scaffolding Pipeline", () => {
  let tempDir: string;
  const templateRoot = resolve(import.meta.dir, "../templates");

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "hono-scaffold-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should scaffold a complete Bun + Postgres + Better Auth + Upstash + OTel + S3 + Resend + Paystack + QStash stack", async () => {
    await runInstallers({
      options: {
        projectName: "bun-full-app",
        projectDir: tempDir,
        runtime: "bun",
        db: "postgres",
        auth: "better-auth",
        firebaseAuth: false,
        redis: "upstash",
        observability: "otel",
        docs: "scalar-fern",
        email: "resend",
        storage: "s3",
        payments: "paystack",
        qstash: true,
        linter: "oxlint",
        git: true,
        installDeps: false,
        packageManager: "bun",
      },
      templateRoot,
      projectDir: tempDir,
    });

    // Check core files matching hustlers_backend structure
    expect(await fileExists(join(tempDir, "src/index.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/serve.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/serve-local.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/core/env-schema.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/core/env-validation.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/core/logger.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/core/errors.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/core/error-handlers.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/core/request-context.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/middleware/request-context.middleware.ts"))).toBe(true);

    // Check DB files & scripts
    expect(await fileExists(join(tempDir, "drizzle.config.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/core/db.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/db/models/users.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/db/models/index.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/db/relations.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/db/enums.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "scripts/db-seed.ts"))).toBe(true);

    // Check Auth files
    expect(await fileExists(join(tempDir, "src/core/auth.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/middleware/auth.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/api/v1/auth/router.ts"))).toBe(true);

    // Check Redis & Rate limit
    expect(await fileExists(join(tempDir, "src/core/redis.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/core/rate-limiter.ts"))).toBe(true);

    // Check Observability
    expect(await fileExists(join(tempDir, "src/instrument.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/core/telemetry.ts"))).toBe(true);

    // Check Docs, Fern & Scripts
    expect(await fileExists(join(tempDir, "src/core/openapi.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "fern/fern.config.json"))).toBe(true);
    expect(await fileExists(join(tempDir, "scripts/generate-openapi.ts"))).toBe(true);

    // Check Email & Storage
    expect(await fileExists(join(tempDir, "src/services/email.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/services/storage.ts"))).toBe(true);

    // Check Paystack & QStash Integrations
    expect(await fileExists(join(tempDir, "src/integrations/payments/paystack.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/api/v1/payments.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/integrations/qstash.ts"))).toBe(true);

    // Check Docker Compose
    expect(await fileExists(join(tempDir, "docker-compose.yml"))).toBe(true);
    const compose = await readFileSafe(join(tempDir, "docker-compose.yml"));
    expect(compose).toContain("postgres:");
    expect(compose).toContain("redis:");
    expect(compose).toContain("rustfs:");

    // Check Tooling, CI, Husky, and Test helpers
    expect(await fileExists(join(tempDir, ".github/workflows/ci.yml"))).toBe(true);
    expect(await fileExists(join(tempDir, ".husky/pre-commit"))).toBe(true);
    expect(await fileExists(join(tempDir, ".lintstagedrc.mjs"))).toBe(true);
    expect(await fileExists(join(tempDir, "tests/helpers.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "tests/setup.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "tests/api.test.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "vitest.config.ts"))).toBe(true);

    // Check package.json dependencies
    const pkg = await readPackageJson(tempDir);
    expect(pkg.dependencies?.["hono"]).toBeDefined();
    expect(pkg.dependencies?.["drizzle-orm"]).toBeDefined();
    expect(pkg.dependencies?.["postgres"]).toBeDefined();
    expect(pkg.dependencies?.["better-auth"]).toBeDefined();
    expect(pkg.dependencies?.["@upstash/redis"]).toBeDefined();
    expect(pkg.dependencies?.["@opentelemetry/sdk-node"]).toBeDefined();
    expect(pkg.dependencies?.["@scalar/hono-api-reference"]).toBeDefined();
    expect(pkg.dependencies?.["resend"]).toBeDefined();
    expect(pkg.dependencies?.["@aws-sdk/client-s3"]).toBeDefined();
    expect(pkg.dependencies?.["ofetch"]).toBeDefined();
    expect(pkg.dependencies?.["@upstash/qstash"]).toBeDefined();
    expect(pkg.devDependencies?.["oxlint"]).toBeDefined();
    expect(pkg.devDependencies?.["vitest"]).toBeDefined();

    // Check v1Router & index.ts routing
    const v1RouterContent = await readFileSafe(join(tempDir, "src/api/v1/router.ts"));
    expect(v1RouterContent).toContain('import { authRouter } from "./auth/router.js";');
    expect(v1RouterContent).toContain('import { paymentsRouter } from "./payments.js";');
    expect(v1RouterContent).toContain('v1Router.route("/auth", authRouter);');
    expect(v1RouterContent).toContain('v1Router.route("/payments", paymentsRouter);');

    const indexContent = await readFileSafe(join(tempDir, "src/index.ts"));
    expect(indexContent).toContain('app.route("/api/v1", v1Router);');
    expect(indexContent).toContain("setupOpenApiDocs(app);");
  });

  it("should scaffold a Node.js + Custom JWT + Firebase Auth + ioredis + Sentry + Nodemailer stack", async () => {
    await runInstallers({
      options: {
        projectName: "node-app",
        projectDir: tempDir,
        runtime: "node",
        db: "sqlite",
        auth: "custom-jwt",
        firebaseAuth: true,
        redis: "ioredis",
        observability: "sentry",
        docs: "none",
        email: "nodemailer",
        storage: "cloudinary",
        payments: "none",
        qstash: false,
        linter: "oxlint",
        git: false,
        installDeps: false,
        packageManager: "bun",
      },
      templateRoot,
      projectDir: tempDir,
    });

    expect(await fileExists(join(tempDir, "src/api/v1/auth/tokens.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/api/v1/auth/service.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/api/v1/auth/schemas.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/api/v1/auth/router.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/middleware/auth.middleware.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/integrations/firebase.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/integrations/storage/cloudinary.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/services/storage.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/core/sentry.ts"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/services/email.ts"))).toBe(true);

    const authContent = await readFileSafe(join(tempDir, "src/api/v1/auth/router.ts"));
    expect(authContent).toContain('/google');

    const pkg = await readPackageJson(tempDir);
    expect(pkg.dependencies?.["@hono/node-server"]).toBeDefined();
    expect(pkg.dependencies?.["better-sqlite3"]).toBeDefined();
    expect(pkg.dependencies?.["jose"]).toBeDefined();
    expect(pkg.dependencies?.["firebase-admin"]).toBeDefined();
    expect(pkg.dependencies?.["cloudinary"]).toBeDefined();
    expect(pkg.dependencies?.["ioredis"]).toBeDefined();
    expect(pkg.dependencies?.["@sentry/node"]).toBeDefined();
    expect(pkg.dependencies?.["nodemailer"]).toBeDefined();

    const compose = await readFileSafe(join(tempDir, "docker-compose.yml"));
    expect(compose).toContain("redis:");
    expect(compose).toContain("mailpit:");
    expect(compose).not.toContain("postgres:");
  });

  it("should scaffold a Cloudflare Workers stack", async () => {
    await runInstallers({
      options: {
        projectName: "cf-app",
        projectDir: tempDir,
        runtime: "cloudflare-workers",
        db: "none",
        auth: "none",
        firebaseAuth: false,
        redis: "none",
        observability: "none",
        docs: "none",
        email: "none",
        storage: "none",
        payments: "none",
        qstash: false,
        linter: "none",
        git: false,
        installDeps: false,
        packageManager: "bun",
      },
      templateRoot,
      projectDir: tempDir,
    });

    expect(await fileExists(join(tempDir, "wrangler.json"))).toBe(true);
    expect(await fileExists(join(tempDir, "src/index.ts"))).toBe(true);
  });
});
