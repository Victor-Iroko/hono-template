import * as p from "@clack/prompts";
import pc from "picocolors";
import { resolve } from "node:path";
import type {
  ProjectOptions,
  CliFlags,
  RuntimeChoice,
  DbDialect,
  AuthChoice,
  RedisChoice,
  ObservabilityChoice,
  DocsChoice,
  EmailChoice,
  StorageChoice,
  PaymentChoice,
  LinterChoice,
  PackageManagerChoice,
} from "./types.js";
import { detectPackageManager } from "../utils/package-manager.js";

function handleCancel<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("Operation cancelled by user.");
    process.exit(0);
  }
  return value as T;
}

export async function promptProjectOptions(
  defaultName?: string,
  flags?: CliFlags
): Promise<ProjectOptions> {
  p.intro(pc.bgMagenta(pc.white(pc.bold(" 🚀 CREATE HONO STACK "))));

  // Project Name
  let projectName = flags?.projectName || defaultName;
  if (!projectName) {
    const namePrompt = await p.text({
      message: "What is your project name?",
      placeholder: "my-hono-app",
      defaultValue: "my-hono-app",
      validate: (value) => {
        if (!value || !value.trim()) return "Project name cannot be empty.";
        if (/[^a-zA-Z0-9-_.]/.test(value)) return "Project name can only contain letters, numbers, hyphens, and underscores.";
      },
    });
    projectName = handleCancel(namePrompt);
  }

  // Runtime Target
  let runtime: RuntimeChoice = flags?.runtime ?? "bun";
  if (!flags?.runtime && !flags?.nonInteractive) {
    const runtimePrompt = await p.select<RuntimeChoice>({
      message: "Select target runtime environment:",
      initialValue: "bun",
      options: [
        { value: "bun", label: "Bun (Recommended - Fast native runtime)", hint: "Native Bun APIs" },
        { value: "node", label: "Node.js (@hono/node-server)", hint: "Standard Node 20+" },
        { value: "cloudflare-workers", label: "Cloudflare Workers", hint: "Serverless edge" },
      ],
    });
    runtime = handleCancel(runtimePrompt);
  }

  // Database & ORM
  let db: DbDialect = flags?.db ?? "postgres";
  if (!flags?.db && !flags?.nonInteractive) {
    const dbPrompt = await p.select<DbDialect>({
      message: "Select database & ORM (Drizzle):",
      initialValue: "postgres",
      options: [
        { value: "postgres", label: "PostgreSQL (Recommended)", hint: "postgres.js + Docker Compose" },
        { value: "sqlite", label: "SQLite / LibSQL", hint: "better-sqlite3 / Turso" },
        { value: "mysql", label: "MySQL", hint: "mysql2 + Docker Compose" },
        { value: "none", label: "None", hint: "In-memory or no database" },
      ],
    });
    db = handleCancel(dbPrompt);
  }

  // Authentication
  let auth: AuthChoice = flags?.auth ?? "better-auth";
  if (!flags?.auth && !flags?.nonInteractive) {
    const authPrompt = await p.select<AuthChoice>({
      message: "Select authentication strategy:",
      initialValue: "better-auth",
      options: [
        { value: "better-auth", label: "Better Auth (Recommended)", hint: "Full-featured, type-safe auth" },
        { value: "custom-jwt", label: "Custom JWT (Access + Refresh Token rotation)", hint: "Lightweight Jose JWT" },
        { value: "none", label: "None", hint: "Public API" },
      ],
    });
    auth = handleCancel(authPrompt);
  }

  // Firebase Google Auth (for custom-jwt)
  let firebaseAuth = flags?.firebaseAuth ?? false;
  if (auth === "custom-jwt" && flags?.firebaseAuth === undefined && !flags?.nonInteractive) {
    const fbPrompt = await p.confirm({
      message: "Include Firebase Admin for Google / Social sign-in token verification?",
      initialValue: true,
    });
    firebaseAuth = handleCancel(fbPrompt);
  }

  // Redis & Rate Limiting
  let redis: RedisChoice = flags?.redis ?? "upstash";
  if (!flags?.redis && !flags?.nonInteractive) {
    const redisPrompt = await p.select<RedisChoice>({
      message: "Select caching & rate-limiting provider:",
      initialValue: "upstash",
      options: [
        { value: "upstash", label: "Upstash Redis (Recommended - HTTP/Serverless)", hint: "@upstash/redis + ratelimit" },
        { value: "ioredis", label: "Standard Redis (ioredis)", hint: "Self-hosted / Docker Redis" },
        { value: "none", label: "None", hint: "No caching or rate limiting" },
      ],
    });
    redis = handleCancel(redisPrompt);
  }

  // Observability & Error Tracking
  let observability: ObservabilityChoice = flags?.observability ?? "otel";
  if (!flags?.observability && !flags?.nonInteractive) {
    const obsPrompt = await p.select<ObservabilityChoice>({
      message: "Select observability & error monitoring:",
      initialValue: "otel",
      options: [
        { value: "otel", label: "OpenTelemetry (OTel)", hint: "Distributed tracing & metrics export" },
        { value: "sentry", label: "Sentry", hint: "Error tracking & performance monitoring" },
        { value: "none", label: "None (Pino logging only)", hint: "Standard structured logs" },
      ],
    });
    observability = handleCancel(obsPrompt);
  }

  // API Docs & SDK Generation
  let docs: DocsChoice = flags?.docs ?? "scalar-fern";
  if (!flags?.docs && !flags?.nonInteractive) {
    const docsPrompt = await p.select<DocsChoice>({
      message: "Include API Reference & SDK generator?",
      initialValue: "scalar-fern",
      options: [
        { value: "scalar-fern", label: "Scalar API Reference + Fern SDK generation", hint: "/reference UI & SDK configs" },
        { value: "none", label: "None", hint: "Skip docs & SDK setup" },
      ],
    });
    docs = handleCancel(docsPrompt);
  }

  // Email Service
  let email: EmailChoice = flags?.email ?? "resend";
  if (!flags?.email && !flags?.nonInteractive) {
    const emailPrompt = await p.select<EmailChoice>({
      message: "Select email service:",
      initialValue: "resend",
      options: [
        { value: "resend", label: "Resend (Recommended - Modern developer email API)", hint: "Type-safe SDK & webhooks" },
        { value: "nodemailer", label: "Nodemailer (SMTP transport with Mailpit local dev)", hint: "Classic SMTP transport" },
        { value: "none", label: "None", hint: "Skip email setup" },
      ],
    });
    email = handleCancel(emailPrompt);
  }

  // File Storage & Media
  let storage: StorageChoice = flags?.storage ?? "s3";
  if (!flags?.storage && !flags?.nonInteractive) {
    const storagePrompt = await p.select<StorageChoice>({
      message: "Select file storage / media provider:",
      initialValue: "s3",
      options: [
        { value: "s3", label: "S3 Object Storage (AWS S3 / Cloudflare R2 / RustFS / MinIO)", hint: "Presigned upload/download URLs" },
        { value: "cloudinary", label: "Cloudinary (Media CDN, image transforms, direct upload signatures)", hint: "Cloud image/video hosting" },
        { value: "none", label: "None", hint: "Skip storage setup" },
      ],
    });
    storage = handleCancel(storagePrompt);
  }

  // Payments Gateway (Paystack)
  let payments: PaymentChoice = flags?.payments ?? "paystack";
  if (!flags?.payments && !flags?.nonInteractive) {
    const payPrompt = await p.select<PaymentChoice>({
      message: "Select payment provider integration:",
      initialValue: "paystack",
      options: [
        { value: "paystack", label: "Paystack (Transactions, card charges, transfers, webhooks)", hint: "Full payment integration" },
        { value: "none", label: "None", hint: "Skip payment integration" },
      ],
    });
    payments = handleCancel(payPrompt);
  }

  // Upstash QStash Background Queues
  let qstash = flags?.qstash ?? false;
  if (flags?.qstash === undefined && !flags?.nonInteractive) {
    const qstashPrompt = await p.confirm({
      message: "Include Upstash QStash for background jobs & event publishing?",
      initialValue: false,
    });
    qstash = handleCancel(qstashPrompt);
  }

  // Tooling & Linters
  let linter: LinterChoice = flags?.linter ?? "oxlint";
  if (!flags?.linter && !flags?.nonInteractive) {
    const linterPrompt = await p.select<LinterChoice>({
      message: "Select code quality & linter:",
      initialValue: "oxlint",
      options: [
        { value: "oxlint", label: "Oxlint + Oxfmt (Ultra-fast Rust tooling)", hint: "Fast linting and formatting" },
        { value: "none", label: "None", hint: "Standard TypeScript only" },
      ],
    });
    linter = handleCancel(linterPrompt);
  }

  // Git initialization
  let git = flags?.git ?? true;
  if (flags?.git === undefined && !flags?.nonInteractive) {
    const gitPrompt = await p.confirm({
      message: "Initialize git repository with Husky pre-commit hooks & CI?",
      initialValue: true,
    });
    git = handleCancel(gitPrompt);
  }

  // Package Manager & Dependency Install
  const detectedPm = detectPackageManager();
  let installDeps = flags?.install ?? true;
  let packageManager: PackageManagerChoice = flags?.packageManager ?? detectedPm;

  if (flags?.install === undefined && !flags?.nonInteractive) {
    const installPrompt = await p.confirm({
      message: `Install dependencies now using ${detectedPm}?`,
      initialValue: true,
    });
    installDeps = handleCancel(installPrompt);
  }

  const projectDir = resolve(process.cwd(), projectName);

  return {
    projectName,
    projectDir,
    runtime,
    db,
    auth,
    firebaseAuth,
    redis,
    observability,
    docs,
    email,
    storage,
    payments,
    qstash,
    linter,
    git,
    installDeps,
    packageManager,
  };
}
