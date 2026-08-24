import { join } from "node:path";
import type { InstallerContext } from "./types.js";
import { copyTemplateDir } from "../utils/fs.js";
import { mergePackageJson } from "../utils/pkg-json.js";
import { appendEnvVars } from "../utils/env.js";
import { injectAtMarker, replaceMarkerBlock } from "../utils/injector.js";

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
      "src/core/env-schema.ts",
      "// [INSTALLER:ENV_SCHEMA]",
      `  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string().default("http://localhost:3000"),`
    );

    await injectAtMarker(
      ctx.projectDir,
      "src/index.ts",
      "// [INSTALLER:IMPORTS]",
      'import type { auth } from "./core/auth.js";'
    );

    await replaceMarkerBlock(
      ctx.projectDir,
      "src/index.ts",
      "// [INSTALLER:VARIABLES_START]",
      "// [INSTALLER:VARIABLES_END]",
      `export type Variables = RequestContext & {
  user?: typeof auth.$Infer.Session.user;
  session?: typeof auth.$Infer.Session.session;
};`
    );

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
        ACCESS_TOKEN_EXPIRE_MINUTES: "15",
        SESSION_EXPIRE_DAYS: "7",
      },
      example: {
        ACCESS_TOKEN_SECRET_KEY: "your-jwt-secret-here",
        ACCESS_TOKEN_EXPIRE_MINUTES: "15",
        SESSION_EXPIRE_DAYS: "7",
      },
      test: {
        ACCESS_TOKEN_SECRET_KEY: "test-jwt-secret-12345",
        ACCESS_TOKEN_EXPIRE_MINUTES: "15",
        SESSION_EXPIRE_DAYS: "7",
      },
      comments: ["JWT & Stateful Session Authentication Configuration"],
    });

    await injectAtMarker(
      ctx.projectDir,
      "src/core/env-schema.ts",
      "// [INSTALLER:ENV_SCHEMA]",
      `  ACCESS_TOKEN_SECRET_KEY: z.string(),
  ACCESS_TOKEN_EXPIRE_MINUTES: z.coerce.number().default(15),
  SESSION_EXPIRE_DAYS: z.coerce.number().default(7),`
    );

    await injectAtMarker(
      ctx.projectDir,
      "src/index.ts",
      "// [INSTALLER:IMPORTS]",
      'import type { AccessTokenPayload } from "./api/v1/auth/tokens.js";'
    );

    await replaceMarkerBlock(
      ctx.projectDir,
      "src/index.ts",
      "// [INSTALLER:VARIABLES_START]",
      "// [INSTALLER:VARIABLES_END]",
      `export type Variables = RequestContext & {
  user?: AccessTokenPayload;
};`
    );

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
