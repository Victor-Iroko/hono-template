export type RuntimeChoice = "bun" | "node" | "cloudflare-workers";

export type DbDialect = "postgres" | "sqlite" | "mysql" | "none";

export type AuthChoice = "better-auth" | "custom-jwt" | "none";

export type RedisChoice = "upstash" | "ioredis" | "none";

export type ObservabilityChoice = "otel" | "sentry" | "none";

export type DocsChoice = "scalar-fern" | "none";

export type EmailChoice = "resend" | "nodemailer" | "none";

export type StorageChoice = "s3" | "cloudinary" | "none";

export type PaymentChoice = "paystack" | "none";

export type LinterChoice = "oxlint" | "none";

export type PackageManagerChoice = "bun" | "npm" | "pnpm" | "yarn";

export interface ProjectOptions {
  projectName: string;
  projectDir: string;
  runtime: RuntimeChoice;
  db: DbDialect;
  auth: AuthChoice;
  firebaseAuth: boolean;
  redis: RedisChoice;
  observability: ObservabilityChoice;
  docs: DocsChoice;
  email: EmailChoice;
  storage: StorageChoice;
  payments: PaymentChoice;
  qstash: boolean;
  linter: LinterChoice;
  git: boolean;
  installDeps: boolean;
  packageManager: PackageManagerChoice;
}

export interface CliFlags {
  projectName?: string;
  runtime?: RuntimeChoice;
  db?: DbDialect;
  auth?: AuthChoice;
  firebaseAuth?: boolean;
  redis?: RedisChoice;
  observability?: ObservabilityChoice;
  docs?: DocsChoice;
  email?: EmailChoice;
  storage?: StorageChoice;
  payments?: PaymentChoice;
  qstash?: boolean;
  linter?: LinterChoice;
  git?: boolean;
  install?: boolean;
  packageManager?: PackageManagerChoice;
  nonInteractive?: boolean;
  dryRun?: boolean;
  force?: boolean;
}
