import type { InstallerContext } from "./types.js";
import { installBase } from "./base.js";
import { installDb } from "./db.js";
import { installAuth } from "./auth.js";
import { installRedis } from "./redis.js";
import { installObservability } from "./observability.js";
import { installDocs } from "./docs.js";
import { installEmail } from "./email.js";
import { installStorage } from "./storage.js";
import { installIntegrations } from "./integrations.js";
import { installTooling } from "./tooling.js";
import { installDocker } from "./docker.js";

export async function runInstallers(ctx: InstallerContext): Promise<void> {
  // 1. Base Project Scaffold
  await installBase(ctx);

  // 2. Database & ORM
  await installDb(ctx);

  // 3. Authentication
  await installAuth(ctx);

  // 4. Redis & Rate Limiter
  await installRedis(ctx);

  // 5. Observability (OTel / Sentry)
  await installObservability(ctx);

  // 6. Docs & SDK (Scalar / Fern)
  await installDocs(ctx);

  // 7. Email Service (Resend / Nodemailer)
  await installEmail(ctx);

  // 8. File Storage (S3 / RustFS)
  await installStorage(ctx);

  // 9. Integrations (Paystack, Firebase Google Auth, QStash)
  await installIntegrations(ctx);

  // 10. Tooling (Oxlint, Vitest, CI)
  await installTooling(ctx);

  // 11. Docker & Compose
  await installDocker(ctx);
}
