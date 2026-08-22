import { join } from "node:path";
import type { InstallerContext } from "./types.js";
import { copyTemplateDir } from "../utils/fs.js";
import { mergePackageJson } from "../utils/pkg-json.js";

export async function installTooling(ctx: InstallerContext): Promise<void> {
  const { linter, git } = ctx.options;

  // Oxlint & Oxfmt
  if (linter === "oxlint") {
    const oxlintDir = join(ctx.templateRoot, "extras", "tooling", "oxlint");
    await copyTemplateDir(oxlintDir, ctx.projectDir);

    await mergePackageJson(ctx.projectDir, {
      devDependencies: {
        oxfmt: "^0.23.0",
        oxlint: "^1.53.0",
      },
      scripts: {
        lint: "oxlint .",
        "lint:fix": "oxlint --fix .",
        format: "oxfmt .",
        "format:check": "oxfmt --check .",
      },
    });
  }

  // Vitest
  const vitestDir = join(ctx.templateRoot, "extras", "tooling", "vitest");
  await copyTemplateDir(vitestDir, ctx.projectDir);

  await mergePackageJson(ctx.projectDir, {
    devDependencies: {
      vitest: "^3.0.7",
    },
    scripts: {
      test: "vitest run",
      "test:watch": "vitest",
    },
  });

  // Git hooks (Husky) & CI
  if (git) {
    const huskyDir = join(ctx.templateRoot, "extras", "tooling", "husky");
    await copyTemplateDir(huskyDir, ctx.projectDir);

    const ciDir = join(ctx.templateRoot, "extras", "tooling", "ci");
    await copyTemplateDir(ciDir, ctx.projectDir);

    await mergePackageJson(ctx.projectDir, {
      devDependencies: {
        husky: "^9.1.7",
        "lint-staged": "^15.4.3",
      },
      scripts: {
        prepare: "husky",
      },
    });
  }
}
