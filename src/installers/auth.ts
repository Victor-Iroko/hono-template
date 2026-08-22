import { join } from "node:path";
import type { InstallerContext } from "./types.js";
import { copyTemplateDir } from "../utils/fs.js";
import { mergePackageJson } from "../utils/pkg-json.js";
import { appendEnvVars } from "../utils/env.js";
import { injectAtMarker } from "../utils/injector.js";

export async function installAuth(ctx: InstallerContext): Promise<void> {
  const { auth } = ctx.options;
  if (auth === "none") {
    return;
  }

  if (auth === "better-auth") {
    const sourceDir = join(ctx.templateRoot, "extras", "auth", "better-auth");
    await copyTemplateDir(sourceDir, ctx.projectDir);

    await mergePackageJson(ctx.projectDir, {
      dependencies: {
        "better-auth": "^1.1.21",
      },
    });

    await appendEnvVars(ctx.projectDir, {
      env: {
        BETTER_AUTH_SECRET: "replace-with-a-random-secret-key-at-least-32-chars-long",
        BETTER_AUTH_URL: "http://localhost:3000",
      },
      example: {
        BETTER_AUTH_SECRET: "your-secret-key-here",
        BETTER_AUTH_URL: "http://localhost:3000",
      },
      test: {
        BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-1234",
        BETTER_AUTH_URL: "http://localhost:3000",
      },
      comments: ["Better Auth Configuration"],
    });

    await injectAtMarker(
      ctx.projectDir,
      "src/api/v1/router.ts",
      "// [INSTALLER:V1_IMPORTS]",
      'import { authRouter } from "./auth/router.js";'
    );

    await injectAtMarker(
      ctx.projectDir,
      "src/api/v1/router.ts",
      "// [INSTALLER:V1_ROUTES]",
      'v1Router.route("/auth", authRouter);'
    );
  } else if (auth === "custom-jwt") {
    const sourceDir = join(ctx.templateRoot, "extras", "auth", "custom-jwt");
    await copyTemplateDir(sourceDir, ctx.projectDir);

    await mergePackageJson(ctx.projectDir, {
      dependencies: {
        jose: "^5.9.6",
      },
    });

    await appendEnvVars(ctx.projectDir, {
      env: {
        ACCESS_TOKEN_SECRET_KEY: "super-secret-access-token-jwt-key-replace-in-production-12345",
        JWT_REFRESH_SECRET: "super-secret-refresh-token-key-replace-in-production-12345",
      },
      example: {
        ACCESS_TOKEN_SECRET_KEY: "your-jwt-secret-here",
        JWT_REFRESH_SECRET: "your-jwt-refresh-secret-here",
      },
      test: {
        ACCESS_TOKEN_SECRET_KEY: "test-jwt-secret-12345",
        JWT_REFRESH_SECRET: "test-jwt-refresh-secret-12345",
      },
      comments: ["JWT Authentication Secrets"],
    });

    await injectAtMarker(
      ctx.projectDir,
      "src/api/v1/router.ts",
      "// [INSTALLER:V1_IMPORTS]",
      'import { authRouter } from "./auth/router.js";'
    );

    await injectAtMarker(
      ctx.projectDir,
      "src/api/v1/router.ts",
      "// [INSTALLER:V1_ROUTES]",
      'v1Router.route("/auth", authRouter);'
    );
  }
}
