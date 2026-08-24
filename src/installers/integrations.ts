import { join } from "node:path";
import type { InstallerContext } from "./types.js";
import { copyTemplateDir } from "../utils/fs.js";
import { mergePackageJson } from "../utils/pkg-json.js";
import { appendEnvVars } from "../utils/env.js";
import { injectAtMarker } from "../utils/injector.js";

export async function installIntegrations(ctx: InstallerContext): Promise<void> {
  const { payments, firebaseAuth, queue, qstash, auth, runtime } = ctx.options;
  const isQStash = queue === "qstash" || (queue === undefined && qstash);
  const isBullMQ = queue === "bullmq";

  // 1. Paystack Payments Integration
  if (payments === "paystack") {
    const paystackDir = join(ctx.templateRoot, "extras", "integrations", "paystack");
    await copyTemplateDir(paystackDir, ctx.projectDir);

    await mergePackageJson(ctx.projectDir, {
      dependencies: {
        ofetch: "^1.4.1",
      },
    });

    await appendEnvVars(ctx.projectDir, {
      env: {
        PAYSTACK_SECRET_KEY: "sk_test_replace_with_your_paystack_secret",
        PAYSTACK_PUBLIC_KEY: "pk_test_replace_with_your_paystack_public",
      },
      example: {
        PAYSTACK_SECRET_KEY: "sk_test_your_secret_key",
        PAYSTACK_PUBLIC_KEY: "pk_test_your_public_key",
      },
      comments: ["Paystack Payment Gateway Configuration"],
    });

    await injectAtMarker(
      ctx.projectDir,
      "src/core/env-schema.ts",
      "// [INSTALLER:ENV_SCHEMA]",
      `  PAYSTACK_SECRET_KEY: z.string(),
  PAYSTACK_PUBLIC_KEY: z.string(),`
    );

    await injectAtMarker(
      ctx.projectDir,
      "src/api/v1/router.ts",
      "// [INSTALLER:V1_IMPORTS]",
      'import { paymentsRouter } from "./payments.js";'
    );

    await injectAtMarker(
      ctx.projectDir,
      "src/api/v1/router.ts",
      "// [INSTALLER:V1_ROUTES]",
      'v1Router.route("/payments", paymentsRouter);'
    );
  }

  // 2. Firebase Google / Social Auth
  if (firebaseAuth) {
    const firebaseDir = join(ctx.templateRoot, "extras", "integrations", "firebase");
    await copyTemplateDir(firebaseDir, ctx.projectDir);

    await mergePackageJson(ctx.projectDir, {
      dependencies: {
        "firebase-admin": "^13.1.0",
      },
    });

    await appendEnvVars(ctx.projectDir, {
      env: {
        FIREBASE_PROJECT_ID: "your-firebase-project-id",
        FIREBASE_CLIENT_EMAIL: "firebase-adminsdk@your-project.iam.gserviceaccount.com",
        FIREBASE_PRIVATE_KEY: "",
      },
      example: {
        FIREBASE_PROJECT_ID: "your-firebase-project-id",
        FIREBASE_CLIENT_EMAIL: "firebase-adminsdk@your-project.iam.gserviceaccount.com",
        FIREBASE_PRIVATE_KEY: "",
      },
      comments: ["Firebase Admin SDK (Google & Social Auth Verification)"],
    });

    await injectAtMarker(
      ctx.projectDir,
      "src/core/env-schema.ts",
      "// [INSTALLER:ENV_SCHEMA]",
      `  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().optional(),`
    );

    if (auth === "custom-jwt") {
      const googleAuthRoute = `
authRouter.post("/google", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.idToken) {
    throw validationError("Google idToken is required");
  }
  const { verifyFirebaseToken } = await import("../../../integrations/firebase.js");
  const fbUser = await verifyFirebaseToken(body.idToken);
  
  const user = {
    id: fbUser.uid,
    email: fbUser.email,
    name: fbUser.name,
    role: "user",
  };
  const { upsertUserSession } = await import("./session.js");
  const { tokens } = await upsertUserSession(user, {
    deviceId: c.req.header("x-device-id"),
    deviceName: c.req.header("x-device-name"),
    userAgent: c.req.header("user-agent"),
    ipAddress: c.req.header("x-forwarded-for")?.split(",")[0]?.trim(),
  });
  setAuthCookies(c, tokens.accessToken);
  return c.json({ success: true, user, tokens });
});
`;
      await injectAtMarker(
        ctx.projectDir,
        "src/api/v1/auth/router.ts",
        "// [INSTALLER:AUTH_ROUTES]",
        googleAuthRoute
      );
    }
  }

  // 3. BullMQ Background Queues
  if (isBullMQ) {
    const bullmqDir = join(ctx.templateRoot, "extras", "integrations", "bullmq");
    await copyTemplateDir(bullmqDir, ctx.projectDir);

    const runner = runtime === "bun" ? "bun" : "tsx";

    await mergePackageJson(ctx.projectDir, {
      dependencies: {
        bullmq: "^5.41.0",
      },
      scripts: {
        worker: `${runner} src/jobs/email.worker.ts`,
      },
    });

    await appendEnvVars(ctx.projectDir, {
      env: {
        REDIS_URL: "redis://localhost:6379",
      },
      example: {
        REDIS_URL: "redis://localhost:6379",
      },
      comments: ["BullMQ Queue Redis Configuration"],
    });

    await injectAtMarker(
      ctx.projectDir,
      "src/core/env-schema.ts",
      "// [INSTALLER:ENV_SCHEMA]",
      `  REDIS_URL: z.string().default("redis://localhost:6379"),`
    );
  }

  // 4. Upstash QStash Background Queues
  if (isQStash) {
    const qstashDir = join(ctx.templateRoot, "extras", "integrations", "qstash");
    await copyTemplateDir(qstashDir, ctx.projectDir);

    await mergePackageJson(ctx.projectDir, {
      dependencies: {
        "@upstash/qstash": "^2.7.23",
      },
    });

    await appendEnvVars(ctx.projectDir, {
      env: {
        DEPLOYMENT_URL: "http://localhost:3000",
        QSTASH_TOKEN: "mock_qstash_token",
        QSTASH_CURRENT_SIGNING_KEY: "mock_qstash_current_signing_key",
        QSTASH_NEXT_SIGNING_KEY: "mock_qstash_next_signing_key",
      },
      example: {
        DEPLOYMENT_URL: "https://api.yourdomain.com",
        QSTASH_TOKEN: "your_upstash_qstash_token",
        QSTASH_CURRENT_SIGNING_KEY: "your_qstash_current_signing_key",
        QSTASH_NEXT_SIGNING_KEY: "your_qstash_next_signing_key",
      },
      comments: ["Upstash QStash Background Queues & Webhook Receiver"],
    });

    await injectAtMarker(
      ctx.projectDir,
      "src/core/env-schema.ts",
      "// [INSTALLER:ENV_SCHEMA]",
      `  DEPLOYMENT_URL: z.string().optional(),
  QSTASH_TOKEN: z.string(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),`
    );

    await injectAtMarker(
      ctx.projectDir,
      "src/api/v1/router.ts",
      "// [INSTALLER:V1_IMPORTS]",
      'import { jobsRouter } from "./jobs/router.js";'
    );

    await injectAtMarker(
      ctx.projectDir,
      "src/api/v1/router.ts",
      "// [INSTALLER:V1_ROUTES]",
      'v1Router.route("/jobs", jobsRouter);'
    );
  }
}
