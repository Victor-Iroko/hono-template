import { Command } from "commander";
import type { CliFlags } from "./types.js";

export function parseCliFlags(argv: string[]): { projectName?: string; flags: CliFlags } {
  const program = new Command();

  program
    .name("create-hono-stack")
    .description("Scaffold a modern, production-grade Hono application")
    .argument("[project-name]", "Target project directory or name")
    .option("-r, --runtime <runtime>", "Runtime target (bun, node, cloudflare-workers)")
    .option("-d, --db <database>", "Database ORM dialect (postgres, sqlite, mysql, none)")
    .option("-a, --auth <auth>", "Authentication strategy (better-auth, custom-jwt, none)")
    .option("--firebase-auth", "Enable Firebase Google/Social Auth integration for custom-jwt", false)
    .option("--redis <redis>", "Caching and rate-limiting provider (upstash, ioredis, none)")
    .option("--observability <obs>", "Observability provider (otel, sentry, none)")
    .option("--docs <docs>", "API Documentation & SDKs (scalar-fern, none)")
    .option("--email <email>", "Email service (resend, nodemailer, none)")
    .option("--storage <storage>", "File storage provider (s3, cloudinary, none)")
    .option("--payments <payments>", "Payment gateway integration (paystack, none)")
    .option("--qstash", "Enable Upstash QStash message queues and background jobs", false)
    .option("--linter <linter>", "Linter and formatter (oxlint, none)")
    .option("--git", "Initialize git repository and hooks", true)
    .option("--no-git", "Skip git initialization")
    .option("-i, --install", "Install dependencies after scaffolding", true)
    .option("--no-install", "Skip dependency installation")
    .option("--package-manager <pm>", "Package manager (bun, npm, pnpm, yarn)")
    .option("-y, --non-interactive", "Run non-interactively with flag values or defaults", false)
    .option("--dry-run", "Simulate actions without writing files", false)
    .option("-f, --force", "Overwrite existing directory", false)
    .allowUnknownOption(false);

  program.parse(argv);

  const projectName = program.args[0];
  const opts = program.opts();

  const flags: CliFlags = {
    runtime: opts.runtime,
    db: opts.db,
    auth: opts.auth,
    firebaseAuth: opts.firebaseAuth,
    redis: opts.redis,
    observability: opts.observability,
    docs: opts.docs,
    email: opts.email,
    storage: opts.storage,
    payments: opts.payments,
    qstash: opts.qstash,
    linter: opts.linter,
    git: opts.git,
    install: opts.install,
    packageManager: opts.packageManager,
    nonInteractive: opts.nonInteractive,
    dryRun: opts.dryRun,
    force: opts.force,
  };

  return { projectName, flags };
}
