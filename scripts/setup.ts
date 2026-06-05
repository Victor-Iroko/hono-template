#!/usr/bin/env bun
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { STUB_MANIFEST, DEPENDENCIES, PACKAGE_JSON_PATCH } from "./stubs.js";

type Flags = {
  force: boolean;
  skipDeps: boolean;
  skipAuthGenerate: boolean;
  dryRun: boolean;
  help: boolean;
};

const CWD = process.cwd();
const IS_WIN = process.platform === "win32";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";

const c = (color: string, text: string) => `${color}${text}${RESET}`;
const ok = (text: string) => c(GREEN, `✓ ${text}`);
const skip = (text: string) => c(DIM, `↷ ${text}`);
const warn = (text: string) => c(YELLOW, `! ${text}`);
const fail = (text: string) => c(RED, `✗ ${text}`);
const info = (text: string) => c(CYAN, `• ${text}`);
const header = (text: string) => `\n${c(BOLD, c(MAGENTA, text))}\n`;

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {
    force: false,
    skipDeps: false,
    skipAuthGenerate: false,
    dryRun: false,
    help: false,
  };
  for (const arg of argv) {
    switch (arg) {
      case "--force":
        flags.force = true;
        break;
      case "--skip-deps":
        flags.skipDeps = true;
        break;
      case "--skip-auth-generate":
        flags.skipAuthGenerate = true;
        break;
      case "--dry-run":
        flags.dryRun = true;
        break;
      case "-h":
      case "--help":
        flags.help = true;
        break;
      default:
        throw new Error(`Unknown flag: ${arg}`);
    }
  }
  return flags;
}

function printHelp(): void {
  console.log(`${c(BOLD, "hono-template setup")}

Transforms a freshly-scaffolded Hono project into the full hono-template.

${c(BOLD, "Usage:")}
  bun run setup [flags]

${c(BOLD, "Flags:")}
  ${c(CYAN, "--force")}               Overwrite existing files
  ${c(CYAN, "--skip-deps")}           Don't run \`bun add\` (assume deps are installed)
  ${c(CYAN, "--skip-auth-generate")}  Don't prompt for \`better-auth generate\`
  ${c(CYAN, "--dry-run")}             Print actions without writing anything
  ${c(CYAN, "-h, --help")}            Show this help
`);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function commandExists(name: string): boolean {
  const result = spawnSync(IS_WIN ? "where" : "which", [name], { stdio: "pipe" });
  return result.status === 0;
}

function getNodeMajor(): number | null {
  const result = spawnSync("node", ["--version"], { stdio: "pipe", encoding: "utf8" });
  if (result.status !== 0) return null;
  const out = (result.stdout ?? "").trim();
  const major = Number(out.replace(/^v/, "").split(".")[0]);
  return Number.isFinite(major) ? major : null;
}

function runCmd(cmd: string, args: string[], opts: { inherit?: boolean } = {}): number {
  const result = spawnSync(cmd, args, {
    cwd: CWD,
    stdio: opts.inherit ? "inherit" : "pipe",
    env: { ...process.env, CI: "1" },
  });
  return result.status ?? 1;
}

async function checkPrereqs(): Promise<void> {
  console.log(header("Prerequisites"));

  if (!commandExists("bun")) {
    throw new Error("Bun is required. Install: https://bun.sh");
  }
  console.log(ok("Bun"));

  const nodeMajor = getNodeMajor();
  if (nodeMajor === null) {
    throw new Error("Node 20+ is required.");
  }
  if (nodeMajor < 20) {
    throw new Error(`Node 20+ required (detected v${nodeMajor}).`);
  }
  console.log(ok(`Node 20+ (detected v${nodeMajor})`));

  if (commandExists("docker")) {
    console.log(ok("Docker"));
  } else {
    console.log(warn("Docker not found — local Postgres/Redis won't run, but the rest will work"));
  }
}

async function verifyHonoProject(): Promise<{ name: string }> {
  const pkgPath = join(CWD, "package.json");
  if (!(await pathExists(pkgPath))) {
    throw new Error(
      `No package.json found in ${CWD}.\nRun this from the root of a \`bun create hono\` project.`,
    );
  }
  const raw = await readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw) as { name?: string; dependencies?: Record<string, string> };
  const hasHono =
    !!pkg.dependencies?.hono ||
    !!pkg.dependencies?.["@hono/node-server"] ||
    !!pkg.dependencies?.["hono-openapi"];

  if (!hasHono) {
    throw new Error(
      `No Hono dependency found in package.json.\nRun \`bun create hono@latest\` first, then re-run setup.`,
    );
  }
  return { name: pkg.name ?? "hono-app" };
}

async function installDeps(flags: Flags): Promise<void> {
  if (flags.skipDeps) {
    console.log(skip("--skip-deps: skipping dependency install"));
    return;
  }
  console.log(header("Installing dependencies"));

  const install = async (kind: "runtime" | "dev", pkgs: readonly string[]) => {
    if (pkgs.length === 0) return;
    const args = ["add", ...(kind === "dev" ? ["-d"] : []), ...pkgs];
    const label = kind === "dev" ? "devDependencies" : "dependencies";
    console.log(info(`Adding ${pkgs.length} ${label}…`));
    if (flags.dryRun) {
      console.log(`  ${c(DIM, `bun ${args.join(" ")}`)}`);
      return;
    }
    const code = runCmd("bun", args, { inherit: true });
    if (code !== 0) {
      throw new Error(`bun add failed for ${label} (exit ${code})`);
    }
  };

  await install("runtime", DEPENDENCIES.runtime);
  await install("dev", DEPENDENCIES.dev);
}

async function writeStub(
  { path, contents }: { path: string; contents: string },
  flags: Flags,
): Promise<"wrote" | "skipped"> {
  const fullPath = resolve(CWD, path);
  const alreadyExists = await pathExists(fullPath);

  if (alreadyExists && !flags.force) {
    console.log(skip(`${path} (exists, use --force to overwrite)`));
    return "skipped";
  }

  if (flags.dryRun) {
    console.log(info(`${path} → ${contents.length} bytes`));
    return "wrote";
  }

  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, contents, "utf8");
  console.log(ok(path));
  return "wrote";
}

async function writeStubs(flags: Flags): Promise<{ wrote: number; skipped: number }> {
  console.log(header("Writing project files"));
  let wrote = 0;
  let skipped = 0;
  for (const stub of STUB_MANIFEST) {
    const result = await writeStub(stub, flags);
    if (result === "wrote") wrote++;
    else skipped++;
  }
  return { wrote, skipped };
}

type PackageJson = {
  name?: string;
  type?: string;
  scripts?: Record<string, string>;
  "lint-staged"?: Record<string, string[]>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

async function patchPackageJson(flags: Flags): Promise<void> {
  console.log(header("Patching package.json"));
  const pkgPath = join(CWD, "package.json");
  const raw = await readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw) as PackageJson;

  pkg.scripts = { ...pkg.scripts, ...PACKAGE_JSON_PATCH.scripts };
  pkg["lint-staged"] = { ...pkg["lint-staged"], ...PACKAGE_JSON_PATCH["lint-staged"] };

  if (!pkg.type) pkg.type = "module";

  if (flags.dryRun) {
    console.log(info("would merge scripts + lint-staged into package.json"));
    return;
  }

  const formatted = `${JSON.stringify(pkg, null, 2)}\n`;
  await writeFile(pkgPath, formatted, "utf8");
  console.log(ok("package.json scripts + lint-staged merged"));
}

async function initHusky(flags: Flags): Promise<void> {
  console.log(header("Initializing Husky"));
  if ((await pathExists(join(CWD, ".husky/pre-commit"))) && !flags.force) {
    console.log(skip(".husky/pre-commit already exists"));
    return;
  }
  if (flags.dryRun) {
    console.log(info("would run `bunx husky init`"));
    return;
  }
  const code = runCmd("bunx", ["husky", "init"], { inherit: true });
  if (code !== 0) {
    console.log(warn(`husky init exited with code ${code} — ensure .husky/pre-commit exists`));
  } else {
    console.log(ok("husky initialized"));
  }
}

async function promptAuthGenerate(flags: Flags): Promise<void> {
  if (flags.skipAuthGenerate) {
    console.log(skip("--skip-auth-generate: skipping better-auth generate"));
    return;
  }
  console.log(header("Better Auth schema generation"));
  console.log(
    info("Better Auth needs its tables in your database. Run these once your models are defined:"),
  );
  console.log(
    `\n  ${c(CYAN, "bunx @better-auth/cli@latest generate")}\n  ${c(CYAN, "bunx drizzle-kit push")}\n`,
  );

  if (!input.isTTY) {
    console.log(skip("non-interactive shell — skipping prompt"));
    return;
  }
  if (flags.dryRun) return;

  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question("Run `bunx @better-auth/cli@latest generate` now? [y/N] "))
      .trim()
      .toLowerCase();
    if (answer === "y" || answer === "yes") {
      runCmd("bunx", ["@better-auth/cli@latest", "generate"], { inherit: true });
    } else {
      console.log(skip("skipped — run it manually when ready"));
    }
  } finally {
    rl.close();
  }
}

function printSummary(projectName: string, wrote: number, skipped: number, flags: Flags): void {
  console.log(header("Summary"));
  console.log(`${ok(`${c(BOLD, projectName)} is configured`)}`);
  console.log(`  ${c(DIM, `wrote: ${wrote} • skipped: ${skipped} • dry-run: ${flags.dryRun}`)}`);

  console.log(header("Next steps"));
  const steps: string[] = [
    `Set ${c(CYAN, "BETTER_AUTH_SECRET")} — run: ${c(CYAN, "openssl rand -base64 32")}`,
    `Replace ${c(CYAN, "my-api")} / ${c(CYAN, "my-app")} / ${c(CYAN, "mydb")} placeholders with your project names`,
    `Define your first model under ${c(CYAN, "src/db/models/")}`,
    `Add your first route under ${c(CYAN, "src/api/v1/")}`,
    `Update ${c(CYAN, "src/core/openapi-config.ts")} (title, version, server URLs)`,
    `Start dev: ${c(CYAN, "bun run dev")}  (Docker services + tsx watch)`,
    `Open ${c(CYAN, "http://localhost:3000/docs")} for interactive API docs`,
  ];
  for (const step of steps) console.log(`  ${ok(step)}`);

  console.log(header("Optional follow-ups"));
  const optional: string[] = [
    `Run ${c(CYAN, "bunx fern init")} to set up published API docs`,
    `Add a ${c(CYAN, "CHANGELOG.md")} and ${c(CYAN, "CONTRIBUTING.md")}`,
    `Configure TypeDoc for generated code docs`,
  ];
  for (const step of optional) console.log(`  ${info(step)}`);

  console.log("");
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.help) {
    printHelp();
    return;
  }

  console.log(`${c(BOLD, c(MAGENTA, "▲ hono-template setup"))} ${c(DIM, `→ ${CWD}`)}\n`);

  try {
    await checkPrereqs();
    const { name } = await verifyHonoProject();
    console.log(info(`detected project: ${c(BOLD, name)}`));

    await installDeps(flags);
    const { wrote, skipped } = await writeStubs(flags);
    await patchPackageJson(flags);
    await initHusky(flags);
    await promptAuthGenerate(flags);

    printSummary(name, wrote, skipped, flags);
  } catch (err) {
    console.error(`\n${fail(err instanceof Error ? err.message : String(err))}`);
    process.exit(1);
  }
}

await main();
