import { join } from "node:path";
import type { InstallerContext } from "./types.js";
import type { RuntimeChoice, PackageManagerChoice } from "../cli/types.js";
import { writeFileSafe } from "../utils/fs.js";

const NODE_VERSION = "20-alpine";
const BUN_VERSION = "1.2-alpine";
const PNPM_VERSION = "10.5.2";

export async function installDocker(ctx: InstallerContext): Promise<void> {
  const { db, redis, storage, email, runtime, packageManager } = ctx.options;

  // Generate Dockerfile
  const dockerfileContent = generateDockerfile(runtime, packageManager);
  await writeFileSafe(join(ctx.projectDir, "Dockerfile"), dockerfileContent);

  // Generate .dockerignore
  const dockerignoreContent = generateDockerignore();
  await writeFileSafe(join(ctx.projectDir, ".dockerignore"), dockerignoreContent);

  // Generate docker-compose.yml
  const composeContent = generateDockerCompose({ db, redis, storage, email });
  await writeFileSafe(join(ctx.projectDir, "docker-compose.yml"), composeContent);
}

function generateDockerignore(): string {
  return `node_modules
dist
.git
.gitignore
.env
.env.*
!.env.example
coverage
tests
*.log
Dockerfile*
docker-compose*
README.md
.husky
.github
.turbo
`;
}

function generateDockerfile(
  runtime: RuntimeChoice,
  packageManager: PackageManagerChoice = "npm"
): string {
  if (runtime === "bun") {
    return `FROM oven/bun:${BUN_VERSION} AS base
WORKDIR /app

FROM base AS dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS production-dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS release
ENV NODE_ENV=production
WORKDIR /app

# Run as non-root user
USER bun

COPY --from=production-dependencies --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/dist ./dist
COPY --chown=bun:bun package.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD wget -q --spider http://localhost:3000/api/v1/health || exit 1

CMD ["bun", "dist/serve.js"]
`;
  }

  if (packageManager === "pnpm") {
    return `FROM node:${NODE_VERSION} AS base
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM base AS production-dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM base AS release
ENV NODE_ENV=production
WORKDIR /app

# Run as non-root user
USER node

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD wget -q --spider http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/serve.js"]
`;
  }

  if (packageManager === "yarn") {
    return `FROM node:${NODE_VERSION} AS base
WORKDIR /app

FROM base AS dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile || yarn install --immutable

FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN yarn build

FROM base AS production-dependencies
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile || yarn install --production --immutable

FROM base AS release
ENV NODE_ENV=production
WORKDIR /app

# Run as non-root user
USER node

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD wget -q --spider http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/serve.js"]
`;
  }

  // Default to npm
  return `FROM node:${NODE_VERSION} AS base
WORKDIR /app

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS production-dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS release
ENV NODE_ENV=production
WORKDIR /app

# Run as non-root user
USER node

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD wget -q --spider http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/serve.js"]
`;
}

function generateDockerCompose(config: {
  db: string;
  redis: string;
  storage: string;
  email: string;
}): string {
  const services: string[] = [];
  const volumes: string[] = [];

  if (config.db === "postgres") {
    services.push(`  postgres:
    image: postgres:16-alpine
    container_name: postgres-dev
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5`);
    volumes.push("  pgdata:");
  } else if (config.db === "mysql") {
    services.push(`  mysql:
    image: mysql:8.0
    container_name: mysql-dev
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: myapp
    ports:
      - "3306:3306"
    volumes:
      - mysqldata:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 5`);
    volumes.push("  mysqldata:");
  }

  if (config.redis === "ioredis" || config.redis === "upstash") {
    services.push(`  redis:
    image: redis/redis-stack:latest
    container_name: redis-stack-dev
    ports:
      - "6379:6379"
      - "8001:8001"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5`);
    volumes.push("  redisdata:");

    if (config.redis === "upstash") {
      services.push(`  upstash-proxy:
    image: hiett/serverless-redis-http:latest
    container_name: upstash-proxy-dev
    ports:
      - "8079:80"
    environment:
      SRH_MODE: env
      SRH_TOKEN: local-dev-token
      SRH_CONNECTION_STRING: redis://redis:6379
    depends_on:
      redis:
        condition: service_healthy`);
    }
  }

  if (config.storage === "s3") {
    services.push(`  floci:
    image: floci/floci:latest
    container_name: floci-s3-dev
    ports:
      - "4566:4566"
    volumes:
      - floci-data:/var/lib/floci`);
    volumes.push("  floci-data:");
  }

  if (config.email === "nodemailer") {
    services.push(`  mailpit:
    image: axllent/mailpit:latest
    container_name: mailpit-dev
    ports:
      - "1025:1025" # SMTP port
      - "8025:8025" # Web UI port`);
  }

  // Cloudflare Tunnel (Quick Tunnel for Webhook & Public URL Testing)
  services.push(`  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared-tunnel-dev
    restart: unless-stopped
    extra_hosts:
      - "host.docker.internal:host-gateway"
    command: tunnel --url http://host.docker.internal:3000`);

  return `services:
${services.join("\n\n")}

${volumes.length > 0 ? `volumes:\n${volumes.join("\n")}` : ""}
`;
}
