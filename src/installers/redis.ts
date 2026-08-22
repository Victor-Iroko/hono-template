import { join } from "node:path";
import type { InstallerContext } from "./types.js";
import { copyTemplateDir } from "../utils/fs.js";
import { mergePackageJson } from "../utils/pkg-json.js";
import { appendEnvVars } from "../utils/env.js";

export async function installRedis(ctx: InstallerContext): Promise<void> {
  const { redis } = ctx.options;
  if (redis === "none") {
    return;
  }

  if (redis === "upstash") {
    const sourceDir = join(ctx.templateRoot, "extras", "redis", "upstash");
    await copyTemplateDir(sourceDir, ctx.projectDir);

    await mergePackageJson(ctx.projectDir, {
      dependencies: {
        "@upstash/redis": "^1.34.4",
        "@upstash/ratelimit": "^2.0.5",
      },
    });

    await appendEnvVars(ctx.projectDir, {
      env: {
        UPSTASH_REDIS_REST_URL: "http://localhost:8079",
        UPSTASH_REDIS_REST_TOKEN: "local-dev-token",
      },
      example: {
        UPSTASH_REDIS_REST_URL: "",
        UPSTASH_REDIS_REST_TOKEN: "",
      },
      test: {
        UPSTASH_REDIS_REST_URL: "http://localhost:8079",
        UPSTASH_REDIS_REST_TOKEN: "local-dev-token",
      },
      comments: ["Upstash Redis & Rate Limiting"],
    });
  } else if (redis === "ioredis") {
    const sourceDir = join(ctx.templateRoot, "extras", "redis", "ioredis");
    await copyTemplateDir(sourceDir, ctx.projectDir);

    await mergePackageJson(ctx.projectDir, {
      dependencies: {
        ioredis: "^5.5.0",
      },
      devDependencies: {
        "@types/ioredis": "^5.0.0",
      },
    });

    await appendEnvVars(ctx.projectDir, {
      env: {
        REDIS_URL: "redis://localhost:6379",
      },
      example: {
        REDIS_URL: "redis://localhost:6379",
      },
      test: {
        REDIS_URL: "redis://localhost:6379",
      },
      comments: ["Redis Connection"],
    });
  }
}
