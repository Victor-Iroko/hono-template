import { join } from "node:path";
import type { InstallerContext } from "./types.js";
import { copyTemplateDir } from "../utils/fs.js";
import { mergePackageJson } from "../utils/pkg-json.js";
import { appendEnvVars } from "../utils/env.js";

export async function installDb(ctx: InstallerContext): Promise<void> {
  const { db } = ctx.options;
  if (db === "none") {
    return;
  }

  const dbDirName = db === "postgres" ? "drizzle-pg" : db === "sqlite" ? "drizzle-sqlite" : "drizzle-mysql";
  const sourceDir = join(ctx.templateRoot, "extras", "db", dbDirName);

  await copyTemplateDir(sourceDir, ctx.projectDir);

  const dependencies: Record<string, string> = {
    "drizzle-orm": "^0.39.3",
  };

  const devDependencies: Record<string, string> = {
    "drizzle-kit": "^0.30.4",
  };

  let databaseUrl = "";
  let databaseTestUrl = "";

  if (db === "postgres") {
    dependencies["postgres"] = "^3.4.5";
    databaseUrl = "postgresql://postgres:postgres@localhost:5432/myapp";
    databaseTestUrl = "postgresql://postgres:postgres@localhost:5432/myapp_test";
  } else if (db === "sqlite") {
    dependencies["better-sqlite3"] = "^11.8.1";
    devDependencies["@types/better-sqlite3"] = "^7.6.12";
    databaseUrl = "sqlite.db";
    databaseTestUrl = ":memory:";
  } else if (db === "mysql") {
    dependencies["mysql2"] = "^3.12.0";
    databaseUrl = "mysql://root:password@localhost:3306/myapp";
    databaseTestUrl = "mysql://root:password@localhost:3306/myapp_test";
  }

  const runner = ctx.options.runtime === "bun" ? "bun" : "tsx";

  const scripts: Record<string, string> = {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": `${runner} scripts/db-seed.ts`,
  };

  await mergePackageJson(ctx.projectDir, {
    dependencies,
    devDependencies,
    scripts,
  });

  await appendEnvVars(ctx.projectDir, {
    env: { DATABASE_URL: databaseUrl },
    example: { DATABASE_URL: databaseUrl },
    test: { DATABASE_URL: databaseTestUrl },
    comments: ["Database Configuration"],
  });
}
