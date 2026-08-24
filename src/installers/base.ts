import { join } from "node:path";
import type { InstallerContext } from "./types.js";
import { copyTemplateDir } from "../utils/fs.js";
import { mergePackageJson } from "../utils/pkg-json.js";
import { appendEnvVars } from "../utils/env.js";

export async function installBase(ctx: InstallerContext): Promise<void> {
  const { runtime } = ctx.options;
  const baseDir = join(ctx.templateRoot, "base", runtime);

  await copyTemplateDir(baseDir, ctx.projectDir);

  await mergePackageJson(ctx.projectDir, {
    // Set project name
  });

  await appendEnvVars(ctx.projectDir, {
    env: {
      NODE_ENV: "development",
      PORT: "3000",
      LOG_LEVEL: "info",
    },
    example: {
      NODE_ENV: "development",
      PORT: "3000",
      LOG_LEVEL: "info",
    },
    test: {
      NODE_ENV: "test",
      PORT: "3001",
      LOG_LEVEL: "silent",
    },
    comments: ["Application Configuration"],
  });
}
