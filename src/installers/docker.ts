import { join } from "node:path";
import type { InstallerContext } from "./types.js";
import { writeFileSafe } from "../utils/fs.js";

export async function installDocker(ctx: InstallerContext): Promise<void> {
  const { db, redis, storage, email, runtime } = ctx.options;

  // Generate Dockerfile
  const dockerfileContent = generateDockerfile(runtime);
  await writeFileSafe(join(ctx.projectDir, "Dockerfile"), dockerfileContent);

  // Generate .dockerignore
  const dockerignoreContent = `node_modules
dist
.git
.env
.env.test
coverage
*.log
`;
  await writeFileSafe(join(ctx.projectDir, ".dockerignore"), dockerignoreContent);

  // Generate docker-compose.yml
  const composeContent = generateDockerCompose({ db, redis, storage, email });
  await writeFileSafe(join(ctx.projectDir, "docker-compose.yml"), composeContent);
}

function generateDockerfile(runtime: string): string {
  if (runtime === "bun") {
    return `FROM oven/bun:1.2-alpine AS base
WORKDIR /app

FROM base AS dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM base AS release
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["bun", "run", "start"]
`;
  }

  return `FROM node:20-alpine AS base
WORKDIR /app

FROM base AS dependencies
COPY package.json package-lock.json* bun.lock* pnpm-lock.yaml* yarn.lock* ./
RUN npm install

FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build || true

FROM base AS release
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

EXPOSE 3000
CMD ["node", "dist/index.js"]
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
    image: redis:7-alpine
    container_name: redis-dev
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5`);
    volumes.push("  redisdata:");
  }

  if (config.storage === "s3") {
    services.push(`  rustfs:
    image: rustfs/rustfs:latest
    container_name: rustfs-s3-dev
    environment:
      RUSTFS_ACCESS_KEY: rustfsadmin
      RUSTFS_SECRET_KEY: rustfsadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - s3data:/data`);
    volumes.push("  s3data:");
  }

  if (config.email === "nodemailer") {
    services.push(`  mailpit:
    image: axllent/mailpit:latest
    container_name: mailpit-dev
    ports:
      - "1025:1025" # SMTP port
      - "8025:8025" # Web UI port`);
  }

  return `services:
${services.join("\n\n")}

${volumes.length > 0 ? `volumes:\n${volumes.join("\n")}` : ""}
`;
}
