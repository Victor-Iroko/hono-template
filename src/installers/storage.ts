import { join } from "node:path";
import type { InstallerContext } from "./types.js";
import { copyTemplateDir } from "../utils/fs.js";
import { mergePackageJson } from "../utils/pkg-json.js";
import { appendEnvVars } from "../utils/env.js";

export async function installStorage(ctx: InstallerContext): Promise<void> {
  const { storage } = ctx.options;
  if (storage === "none") {
    return;
  }

  if (storage === "cloudinary") {
    const sourceDir = join(ctx.templateRoot, "extras", "storage", "cloudinary");
    await copyTemplateDir(sourceDir, ctx.projectDir);

    await mergePackageJson(ctx.projectDir, {
      dependencies: {
        cloudinary: "^2.5.1",
      },
    });

    await appendEnvVars(ctx.projectDir, {
      env: {
        CLOUDINARY_CLOUD_NAME: "demo",
        CLOUDINARY_API_KEY: "1234567890",
        CLOUDINARY_API_SECRET: "mock_secret",
      },
      example: {
        CLOUDINARY_CLOUD_NAME: "your-cloud-name",
        CLOUDINARY_API_KEY: "your-api-key",
        CLOUDINARY_API_SECRET: "your-api-secret",
      },
      comments: ["Cloudinary Image & Media Storage Configuration"],
    });
  } else if (storage === "s3") {
    const sourceDir = join(ctx.templateRoot, "extras", "storage", "s3");
    await copyTemplateDir(sourceDir, ctx.projectDir);

    await mergePackageJson(ctx.projectDir, {
      dependencies: {
        "@aws-sdk/client-s3": "^3.750.0",
        "@aws-sdk/s3-request-presigner": "^3.750.0",
      },
    });

    await appendEnvVars(ctx.projectDir, {
      env: {
        S3_REGION: "us-east-1",
        S3_ENDPOINT: "http://localhost:9000",
        S3_ACCESS_KEY_ID: "rustfsadmin",
        S3_SECRET_ACCESS_KEY: "rustfsadmin",
        S3_BUCKET: "app-uploads",
        S3_FORCE_PATH_STYLE: "true",
      },
      example: {
        S3_REGION: "us-east-1",
        S3_ENDPOINT: "https://s3.amazonaws.com",
        S3_ACCESS_KEY_ID: "your-access-key",
        S3_SECRET_ACCESS_KEY: "your-secret-key",
        S3_BUCKET: "my-production-bucket",
        S3_FORCE_PATH_STYLE: "false",
      },
      comments: ["S3 Object Storage (Compatible with AWS S3, Cloudflare R2, MinIO, RustFS)"],
    });
  }
}
