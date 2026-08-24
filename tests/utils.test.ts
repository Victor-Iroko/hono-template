import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mergePackageJson, readPackageJson } from "../src/utils/pkg-json.js";
import { appendEnvVars } from "../src/utils/env.js";
import { injectAtMarker, prependImports, replaceMarkerBlock } from "../src/utils/injector.js";
import { readFileSafe, writeFileSafe } from "../src/utils/fs.js";

describe("Scaffolding Utilities", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "hono-test-utils-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should merge dependencies into package.json", async () => {
    await writeFileSafe(
      join(tempDir, "package.json"),
      JSON.stringify({ name: "test-app", dependencies: { hono: "^4.0.0" } }, null, 2)
    );

    await mergePackageJson(tempDir, {
      dependencies: { zod: "^3.22.0", "better-auth": "^1.0.0" },
      devDependencies: { vitest: "^3.0.0" },
      scripts: { dev: "bun --watch src/index.ts" },
    });

    const pkg = await readPackageJson(tempDir);
    expect(pkg.dependencies?.["hono"]).toBe("^4.0.0");
    expect(pkg.dependencies?.["zod"]).toBe("^3.22.0");
    expect(pkg.dependencies?.["better-auth"]).toBe("^1.0.0");
    expect(pkg.devDependencies?.["vitest"]).toBe("^3.0.0");
    expect(pkg.scripts?.["dev"]).toBe("bun --watch src/index.ts");
  });

  it("should append environment variables cleanly", async () => {
    await appendEnvVars(tempDir, {
      env: { PORT: "3000", DATABASE_URL: "postgresql://localhost:5432/test" },
      comments: ["Server Configuration"],
    });

    const envContent = await readFileSafe(join(tempDir, ".env"));
    expect(envContent).toContain("PORT=3000");
    expect(envContent).toContain("DATABASE_URL=postgresql://localhost:5432/test");
    expect(envContent).toContain("# Server Configuration");
  });

  it("should inject content at marker comments", async () => {
    const initialContent = `import { Hono } from "hono";
// [INSTALLER:IMPORTS]

const app = new Hono();
// [INSTALLER:ROUTES]

export default app;`;

    await writeFileSafe(join(tempDir, "src/index.ts"), initialContent);

    await injectAtMarker(
      tempDir,
      "src/index.ts",
      "// [INSTALLER:IMPORTS]",
      'import { authRouter } from "./auth.js";'
    );

    await injectAtMarker(
      tempDir,
      "src/index.ts",
      "// [INSTALLER:ROUTES]",
      'app.route("/auth", authRouter);'
    );

    const result = await readFileSafe(join(tempDir, "src/index.ts"));
    expect(result).toContain('import { authRouter } from "./auth.js";');
    expect(result).toContain('app.route("/auth", authRouter);');
  });

  it("should prepend imports safely", async () => {
    const initialContent = `import { Hono } from "hono";\nconst app = new Hono();`;
    await writeFileSafe(join(tempDir, "src/index.ts"), initialContent);

    await prependImports(tempDir, "src/index.ts", 'import "./instrument.js";');

    const result = await readFileSafe(join(tempDir, "src/index.ts"));
    expect(result.startsWith('import "./instrument.js";')).toBe(true);
  });

  it("should replace marker blocks safely", async () => {
    const initialContent = `import { Hono } from "hono";
// [INSTALLER:VARIABLES_START]
export type Variables = {
  user?: unknown;
};
// [INSTALLER:VARIABLES_END]

const app = new Hono();`;

    await writeFileSafe(join(tempDir, "src/index.ts"), initialContent);

    await replaceMarkerBlock(
      tempDir,
      "src/index.ts",
      "// [INSTALLER:VARIABLES_START]",
      "// [INSTALLER:VARIABLES_END]",
      `export type Variables = {
  user?: { id: string };
};`
    );

    const result = await readFileSafe(join(tempDir, "src/index.ts"));
    expect(result).toContain("user?: { id: string };");
    expect(result).not.toContain("user?: unknown;");
  });
});

