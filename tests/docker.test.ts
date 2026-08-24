import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installDocker } from "../src/installers/docker.js";
import { readFileSafe, fileExists } from "../src/utils/fs.js";
import type { InstallerContext } from "../src/installers/types.js";

describe("Docker Installer", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "hono-test-docker-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should generate production multi-stage Dockerfile for Bun runtime", async () => {
    const ctx: InstallerContext = {
      options: {
        projectName: "test-bun-app",
        projectDir: tempDir,
        runtime: "bun",
        db: "postgres",
        auth: "none",
        firebaseAuth: false,
        redis: "none",
        observability: "none",
        docs: "none",
        email: "none",
        storage: "s3",
        payments: "none",
        qstash: false,
        linter: "none",
        git: false,
        installDeps: false,
        packageManager: "bun",
      },
      templateRoot: join(process.cwd(), "templates"),
      projectDir: tempDir,
    };

    await installDocker(ctx);

    expect(await fileExists(join(tempDir, "Dockerfile"))).toBe(true);
    const dockerfile = await readFileSafe(join(tempDir, "Dockerfile"));

    expect(dockerfile).toContain("FROM oven/bun:1.2-alpine AS base");
    expect(dockerfile).toContain("COPY package.json bun.lock ./");
    expect(dockerfile).toContain("FROM base AS dependencies");
    expect(dockerfile).toContain("FROM base AS build");
    expect(dockerfile).toContain("RUN bun run build");
    expect(dockerfile).toContain("FROM base AS production-dependencies");
    expect(dockerfile).toContain("RUN bun install --frozen-lockfile --production");
    expect(dockerfile).toContain("USER bun");
    expect(dockerfile).toContain("COPY --from=build --chown=bun:bun /app/dist ./dist");
    expect(dockerfile).toContain("HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3");
    expect(dockerfile).toContain('CMD ["bun", "dist/serve.js"]');

    // Docker ignore
    const dockerignore = await readFileSafe(join(tempDir, ".dockerignore"));
    expect(dockerignore).toContain("node_modules");
    expect(dockerignore).toContain("dist");
    expect(dockerignore).toContain(".env");
    expect(dockerignore).toContain("tests");

    // Docker compose
    const compose = await readFileSafe(join(tempDir, "docker-compose.yml"));
    expect(compose).toContain("postgres:");
    expect(compose).toContain("floci:");
    expect(compose).toContain("image: floci/floci:latest");
    expect(compose).toContain("4566:4566");
    expect(compose).toContain("floci-data:");
    expect(compose).toContain("cloudflared:");
    expect(compose).toContain("image: cloudflare/cloudflared:latest");
    expect(compose).toContain("tunnel --url http://host.docker.internal:3000");
  });

  it("should generate production multi-stage Dockerfile for Node runtime with npm", async () => {
    const ctx: InstallerContext = {
      options: {
        projectName: "test-node-app",
        projectDir: tempDir,
        runtime: "node",
        db: "mysql",
        auth: "none",
        firebaseAuth: false,
        redis: "ioredis",
        observability: "none",
        docs: "none",
        email: "nodemailer",
        storage: "none",
        payments: "none",
        qstash: false,
        linter: "none",
        git: false,
        installDeps: false,
        packageManager: "npm",
      },
      templateRoot: join(process.cwd(), "templates"),
      projectDir: tempDir,
    };

    await installDocker(ctx);

    const dockerfile = await readFileSafe(join(tempDir, "Dockerfile"));
    expect(dockerfile).toContain("FROM node:20-alpine AS base");
    expect(dockerfile).toContain("COPY package.json package-lock.json ./");
    expect(dockerfile).toContain("RUN npm ci");
    expect(dockerfile).toContain("RUN npm run build");
    expect(dockerfile).not.toContain("|| true");
    expect(dockerfile).toContain("RUN npm ci --omit=dev");
    expect(dockerfile).toContain("USER node");
    expect(dockerfile).toContain("COPY --from=build --chown=node:node /app/dist ./dist");
    expect(dockerfile).toContain("HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3");
    expect(dockerfile).toContain('CMD ["node", "dist/serve.js"]');

    const compose = await readFileSafe(join(tempDir, "docker-compose.yml"));
    expect(compose).toContain("mysql:");
    expect(compose).toContain("redis:");
    expect(compose).toContain("image: redis/redis-stack:latest");
    expect(compose).toContain("container_name: redis-stack-dev");
    expect(compose).toContain("8001:8001");
    expect(compose).toContain("mailpit:");
    expect(compose).toContain("cloudflared:");
  });

  it("should tailor Node Dockerfile for pnpm and yarn", async () => {
    const pnpmCtx: InstallerContext = {
      options: {
        projectName: "test-pnpm-app",
        projectDir: tempDir,
        runtime: "node",
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
        packageManager: "pnpm",
      },
      templateRoot: join(process.cwd(), "templates"),
      projectDir: tempDir,
    };

    await installDocker(pnpmCtx);
    const pnpmDockerfile = await readFileSafe(join(tempDir, "Dockerfile"));
    expect(pnpmDockerfile).toContain("corepack enable && corepack prepare pnpm@10.5.2 --activate");
    expect(pnpmDockerfile).toContain("COPY package.json pnpm-lock.yaml ./");
    expect(pnpmDockerfile).toContain("pnpm install --frozen-lockfile");
    expect(pnpmDockerfile).toContain("pnpm install --prod --frozen-lockfile");

    const yarnCtx: InstallerContext = {
      ...pnpmCtx,
      options: {
        ...pnpmCtx.options,
        packageManager: "yarn",
      },
    };

    await installDocker(yarnCtx);
    const yarnDockerfile = await readFileSafe(join(tempDir, "Dockerfile"));
    expect(yarnDockerfile).toContain("COPY package.json yarn.lock ./");
    expect(yarnDockerfile).toContain("yarn install --frozen-lockfile || yarn install --immutable");
    expect(yarnDockerfile).toContain("yarn install --production --frozen-lockfile || yarn install --production --immutable");
  });

  it("should generate upstash-proxy service in docker-compose when redis is upstash", async () => {
    const ctx: InstallerContext = {
      options: {
        projectName: "test-upstash-app",
        projectDir: tempDir,
        runtime: "bun",
        db: "postgres",
        auth: "none",
        firebaseAuth: false,
        redis: "upstash",
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
      templateRoot: join(process.cwd(), "templates"),
      projectDir: tempDir,
    };

    await installDocker(ctx);

    const compose = await readFileSafe(join(tempDir, "docker-compose.yml"));
    expect(compose).toContain("redis:");
    expect(compose).toContain("image: redis/redis-stack:latest");
    expect(compose).toContain("upstash-proxy:");
    expect(compose).toContain("image: hiett/serverless-redis-http:latest");
    expect(compose).toContain("container_name: upstash-proxy-dev");
    expect(compose).toContain('8079:80');
    expect(compose).toContain("SRH_TOKEN: local-dev-token");
    expect(compose).toContain("SRH_CONNECTION_STRING: redis://redis:6379");
  });
});
