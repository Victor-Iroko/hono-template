import { join } from "node:path";
import type { InstallerContext } from "./types.js";
import { copyTemplateDir } from "../utils/fs.js";
import { mergePackageJson } from "../utils/pkg-json.js";
import { appendEnvVars } from "../utils/env.js";
import { injectAtMarker } from "../utils/injector.js";

export async function installIntegrations(ctx: InstallerContext): Promise<void> {
  const { payments, firebaseAuth, qstash, auth } = ctx.options;

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
  const tokens = await signAccessToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = await signRefreshToken({ userId: user.id, email: user.email, role: user.role });
  setAuthCookies(c, tokens);
  return c.json({ success: true, user, tokens: { accessToken: tokens, refreshToken } });
});
`;
      await injectAtMarker(
        ctx.projectDir,
        "src/api/v1/auth/router.ts",
        "export const authRouter = new Hono();",
        googleAuthRoute
      );
    }
  }

  // 3. Upstash QStash Background Queues
  if (qstash) {
    const qstashDir = join(ctx.templateRoot, "extras", "integrations", "qstash");
    await copyTemplateDir(qstashDir, ctx.projectDir);

    await mergePackageJson(ctx.projectDir, {
      dependencies: {
        "@upstash/qstash": "^2.7.23",
      },
    });

    await appendEnvVars(ctx.projectDir, {
      env: {
        QSTASH_TOKEN: "mock_qstash_token",
      },
      example: {
        QSTASH_TOKEN: "your_upstash_qstash_token",
      },
      comments: ["Upstash QStash Background Queues"],
    });
  }
}
