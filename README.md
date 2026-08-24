# Create Hono Stack 🚀

An interactive, composable CLI generator to scaffold modern, production-ready **Hono** applications in seconds.

Built with `@clack/prompts`, modular template composition, and end-to-end type safety.

---

## ⚡ Quick Start

### 1. Interactive Scaffolding Wizard

Run directly with `bunx` or `npx`:

```bash
# Using Bun
bunx github:Victor-Iroko/hono-template my-app

# Or npx
npx github:Victor-Iroko/hono-template my-app
```

Follow the interactive prompts to choose your runtime, database, auth strategy, caching, observability, and storage options.

---

## 🛠️ Feature Matrix

| Feature Domain | Supported Options |
| :--- | :--- |
| **Runtime Target** | **Bun** (Native fast runtime), **Node.js** (`@hono/node-server`), **Cloudflare Workers** |
| **Database & ORM** | **Drizzle ORM** (PostgreSQL, SQLite / LibSQL, MySQL) |
| **Authentication** | **Better Auth** (Session & email/password), **Custom JWT** (Access + Refresh token rotation), None |
| **Cache & Rate Limiter**| **Upstash Redis** (`@upstash/redis` + `@upstash/ratelimit`), **Standard Redis** (`ioredis`), None |
| **API Docs & SDKs** | **Scalar API Reference** (`/reference` UI) + **Fern SDK** generation configs |
| **Observability** | **OpenTelemetry** (OTel distributed tracing & metrics), **Sentry** error monitoring, Pino logging |
| **Email Service** | **Resend** (Modern developer email API), **Nodemailer** (SMTP transport + Mailpit dev) |
| **File Storage & Media** | **S3 Object Storage** (`@aws-sdk/client-s3`), **Cloudinary** (Image CDN, transforms, presigned uploads) |
| **Payments** | **Paystack** (Transactions, card charges, bank transfers, webhooks) |
| **Social / Google Auth** | **Firebase Admin** (Google ID token verification for custom-jwt) |
| **Background Queues** | **Upstash QStash** (Serverless message queues & event publishing) |
| **Code Quality & CI** | **Oxlint + Oxfmt** (Ultra-fast Rust tooling), **Vitest**, **Husky pre-commit**, **GitHub Actions CI** |
| **Docker Compose** | Dynamically composed local dev services (PostgreSQL, Redis Stack, Upstash Proxy, Floci S3, Mailpit, Cloudflare Tunnel) |

---

## 🤖 CLI Flags (Automated / Headless Mode)

For CI pipelines, scripted environments, or headless scaffolding, pass flags directly:

```bash
bunx github:Victor-Iroko/hono-template my-app \
  --runtime bun \
  --db postgres \
  --auth better-auth \
  --redis upstash \
  --observability otel \
  --docs scalar-fern \
  --email resend \
  --storage cloudinary \
  --payments paystack \
  --qstash \
  --linter oxlint \
  --non-interactive
```

### All Available Flags

| Flag | Values | Description |
| :--- | :--- | :--- |
| `-r, --runtime <runtime>` | `bun` \| `node` \| `cloudflare-workers` | Target runtime environment |
| `-d, --db <db>` | `postgres` \| `sqlite` \| `mysql` \| `none` | Database dialect (Drizzle ORM) |
| `-a, --auth <auth>` | `better-auth` \| `custom-jwt` \| `none` | Authentication strategy |
| `--firebase-auth` | boolean | Enable Firebase Admin for Google token verification |
| `--redis <redis>` | `upstash` \| `ioredis` \| `none` | Cache and rate-limiting provider |
| `--observability <obs>` | `otel` \| `sentry` \| `none` | Observability & error tracking |
| `--docs <docs>` | `scalar-fern` \| `none` | Scalar API Docs and Fern SDK generation |
| `--email <email>` | `resend` \| `nodemailer` \| `none` | Email service (Resend API or Nodemailer SMTP) |
| `--storage <storage>` | `s3` \| `cloudinary` \| `none` | File storage provider (S3 or Cloudinary) |
| `--payments <payments>` | `paystack` \| `none` | Paystack payment gateway integration |
| `--qstash` | boolean | Enable Upstash QStash background jobs |
| `--linter <linter>` | `oxlint` \| `none` | Linter and formatter tooling |
| `--git` / `--no-git` | boolean | Initialize Git repository and Husky hooks |
| `-i, --install` / `--no-install` | boolean | Install dependencies after scaffolding |
| `--package-manager <pm>` | `bun` \| `npm` \| `pnpm` \| `yarn` | Package manager to use |
| `-y, --non-interactive` | boolean | Skip interactive prompts (use flags or defaults) |
| `--dry-run` | boolean | Preview file actions without writing |
| `-f, --force` | boolean | Overwrite existing project directory |

---

## 🏗️ Project Architecture (Generated App)

```
my-app/
├── src/
│   ├── index.ts                 # Application entrypoint & middleware mounting
│   ├── core/
│   │   ├── env.ts               # Type-safe environment variables (Zod)
│   │   ├── logger.ts            # Structured logging (Pino)
│   │   ├── errors.ts            # Custom typed error classes (AppError, NotFoundError, etc.)
│   │   ├── error-handlers.ts    # Global Hono error & 404 handlers
│   │   ├── request-context.ts   # AsyncLocalStorage request tracing
│   │   ├── auth.ts / jwt.ts     # Auth implementation (Better Auth or Custom JWT)
│   │   ├── redis.ts             # Redis client (Upstash or ioredis)
│   │   ├── rate-limiter.ts      # Sliding window rate limiter middleware
│   │   └── openapi.ts           # Scalar API documentation router
│   ├── api/
│   │   └── v1/
│   │       ├── router.ts        # Base v1 router
│   │       └── auth.ts          # Auth routes (/login, /refresh, /me or Better Auth handler)
│   ├── db/
│   │   ├── client.ts            # Drizzle ORM client instance
│   │   ├── seed.ts              # Database seed script
│   │   └── schema/              # Drizzle table schemas and relations
│   ├── services/
│   │   ├── email.ts             # Nodemailer email sender
│   │   └── storage.ts           # S3 presigned URL client
│   └── middleware/
│       ├── request-context.middleware.ts # Request ID and timing middleware
│       └── auth.ts                       # Authentication guard middleware
├── docker-compose.yml           # Local dev services (Postgres, Redis, RustFS, Mailpit)
├── drizzle.config.ts            # Drizzle Kit migration configuration
├── vitest.config.ts             # Vitest test configuration
├── .oxlintrc.json               # Oxlint configuration
└── .env.example                 # Documented environment variables
```

---

## 💻 Development Workflow (Generated App)

```bash
# 1. Start local dev backing services (PostgreSQL, Redis, RustFS, Mailpit)
docker compose up -d

# 2. Push database schema migrations
bun run db:push

# 3. Start development server
bun run dev

# 4. Run tests
bun run test

# 5. Lint and format
bun run lint
bun run format
```

---

## 🤝 Contributing

Contributions are always welcome! Please check out [CONTRIBUTING.md](./CONTRIBUTING.md) for our architectural design guide, local development workflow, and instructions on adding new installers.

---

## 🤖 Built with AI

This project and its scaffolding templates were designed and built using AI.

---

## 📄 License

MIT
