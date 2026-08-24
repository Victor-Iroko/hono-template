import { join } from "node:path";
import type { InstallerContext } from "./types.js";
import { copyTemplateDir, copyTemplateFile } from "../utils/fs.js";
import { mergePackageJson } from "../utils/pkg-json.js";
import { appendEnvVars } from "../utils/env.js";
import { injectAtMarker } from "../utils/injector.js";

export async function installEmail(ctx: InstallerContext): Promise<void> {
  const { email, queue, qstash } = ctx.options;
  const isBullMQ = queue === "bullmq";
  const isQStash = queue === "qstash" || (queue === undefined && qstash);

  // 1. Direct Email Provider (Resend / Nodemailer / Mock fallback)
  if (email === "resend") {
    const sourceDir = join(ctx.templateRoot, "extras", "email", "resend");
    await copyTemplateDir(sourceDir, ctx.projectDir);

    await mergePackageJson(ctx.projectDir, {
      dependencies: {
        resend: "^4.1.2",
      },
    });

    await appendEnvVars(ctx.projectDir, {
      env: {
        RESEND_API_KEY: "re_test_123456789",
        EMAIL_FROM: "onboarding@resend.dev",
      },
      example: {
        RESEND_API_KEY: "re_your_api_key_here",
        EMAIL_FROM: "Acme <onboarding@yourdomain.com>",
      },
      comments: ["Resend Email API Configuration"],
    });

    await injectAtMarker(
      ctx.projectDir,
      "src/core/env-schema.ts",
      "// [INSTALLER:ENV_SCHEMA]",
      `  RESEND_API_KEY: z.string(),
  EMAIL_FROM: z.string().default("onboarding@resend.dev"),`
    );
  } else if (email === "nodemailer") {
    const sourceDir = join(ctx.templateRoot, "extras", "email", "nodemailer");
    await copyTemplateDir(sourceDir, ctx.projectDir);

    await mergePackageJson(ctx.projectDir, {
      dependencies: {
        nodemailer: "^6.10.0",
      },
      devDependencies: {
        "@types/nodemailer": "^6.4.17",
      },
    });

    await appendEnvVars(ctx.projectDir, {
      env: {
        SMTP_HOST: "localhost",
        SMTP_PORT: "1025",
        SMTP_USER: "",
        SMTP_PASSWORD: "",
        EMAIL_FROM: "noreply@example.com",
      },
      example: {
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "587",
        SMTP_USER: "user@example.com",
        SMTP_PASSWORD: "password",
        EMAIL_FROM: "noreply@example.com",
      },
      comments: ["SMTP Email Configuration (e.g. Mailpit/Mailhog in dev)"],
    });

    await injectAtMarker(
      ctx.projectDir,
      "src/core/env-schema.ts",
      "// [INSTALLER:ENV_SCHEMA]",
      `  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default("noreply@example.com"),`
    );
  } else {
    // email === "none" -> mock email provider
    const mockDir = join(ctx.templateRoot, "extras", "email", "mock");
    await copyTemplateDir(mockDir, ctx.projectDir);
  }

  // 2. Email Templates & Dispatcher (Direct / BullMQ / QStash)
  let templatesVariant = "direct";
  if (isBullMQ) {
    templatesVariant = "bullmq";
  } else if (isQStash) {
    templatesVariant = "qstash";
  }

  const templatesSource = join(
    ctx.templateRoot,
    "extras",
    "email",
    templatesVariant,
    "src",
    "integrations",
    "email",
    "email-templates.ts"
  );
  const templatesTarget = join(ctx.projectDir, "src", "integrations", "email", "email-templates.ts");
  await copyTemplateFile(templatesSource, templatesTarget);
}
