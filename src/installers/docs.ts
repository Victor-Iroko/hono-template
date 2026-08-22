import { join } from "node:path";
import type { InstallerContext } from "./types.js";
import { copyTemplateDir } from "../utils/fs.js";
import { mergePackageJson } from "../utils/pkg-json.js";
import { injectAtMarker } from "../utils/injector.js";

export async function installDocs(ctx: InstallerContext): Promise<void> {
  const { docs, runtime } = ctx.options;
  if (docs === "none") {
    return;
  }

  const sourceDir = join(ctx.templateRoot, "extras", "docs", "scalar-fern");
  await copyTemplateDir(sourceDir, ctx.projectDir);

  const runner = runtime === "bun" ? "bun" : "tsx";

  await mergePackageJson(ctx.projectDir, {
    dependencies: {
      "@scalar/hono-api-reference": "^0.5.176",
    },
    devDependencies: {
      "fern-api": "^0.56.16",
    },
    scripts: {
      "openapi:generate": `${runner} scripts/generate-openapi.ts`,
      "docs:generate": "npx fern generate",
    },
  });

  await injectAtMarker(
    ctx.projectDir,
    "src/index.ts",
    "// [INSTALLER:IMPORTS]",
    'import { setupOpenApiDocs } from "./core/openapi.js";'
  );

  await injectAtMarker(
    ctx.projectDir,
    "src/index.ts",
    "// [INSTALLER:ROUTES]",
    "setupOpenApiDocs(app);"
  );
}
