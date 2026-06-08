#!/usr/bin/env bun
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { DEPENDENCIES, FALLBACK_DEPENDENCY_RANGES, PACKAGE_JSON_PATCH, STUB_MANIFEST } from "./stubs.js";
import { KNOWN_TROUBLEMAKERS } from "./troubles.js";

type Flags = {
  force: boolean;
  skipDeps: boolean;
  skipAuthGenerate: boolean;
  dryRun: boolean;
  help: boolean;
  strict: boolean;
  skipInstall: boolean;
  installTimeout: number;
  packageManager: PackageManagerChoice;
};

type PackageManagerChoice = "bun" | "npm" | "pnpm" | "yarn";

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

const DEFAULT_INSTALL_TIMEOUT_MS = 180_000;
const PER_PACKAGE_TIMEOUT_MS = 60_000;
const VALID_PACKAGE_MANAGERS: readonly PackageManagerChoice[] = ["bun", "npm", "pnpm", "yarn"];

type Invocation = { cmd: string; args: string[] };

type PackageManager = {
  name: PackageManagerChoice;
  bulk: () => Invocation;
  add: (pkg: string, dev: boolean) => Invocation;
  exec: (args: string[]) => Invocation;
  addHint: (pkgs: readonly string[]) => string;
};

function makePackageManager(choice: PackageManagerChoice): PackageManager {
  switch (choice) {
    case "bun":
      return {
        name: "bun",
        bulk: () => ({ cmd: "bun", args: ["install"] }),
        add: (p, d) => ({ cmd: "bun", args: d ? ["add", "-d", p] : ["add", p] }),
        exec: (a) => ({ cmd: "bunx", args: a }),
        addHint: (pkgs) => `bun add ${pkgs.join(" ")}`,
      };
    case "npm":
      return {
        name: "npm",
        bulk: () => ({ cmd: "npm", args: ["install"] }),
        add: (p, d) => ({ cmd: "npm", args: d ? ["install", "-D", p] : ["install", p] }),
        exec: (a) => ({ cmd: "npx", args: a }),
        addHint: (pkgs) => `npm install ${pkgs.join(" ")}`,
      };
    case "pnpm":
      return {
        name: "pnpm",
        bulk: () => ({ cmd: "pnpm", args: ["install"] }),
        add: (p, d) => ({ cmd: "pnpm", args: d ? ["add", "-D", p] : ["add", p] }),
        exec: (a) => ({ cmd: "pnpm", args: ["exec", ...a] }),
        addHint: (pkgs) => `pnpm add ${pkgs.join(" ")}`,
      };
    case "yarn":
      return {
        name: "yarn",
        bulk: () => ({ cmd: "yarn", args: ["install"] }),
        add: (p, d) => ({ cmd: "yarn", args: d ? ["add", "-D", p] : ["add", p] }),
        exec: (a) => ({ cmd: "yarn", args: a }),
        addHint: (pkgs) => `yarn add ${pkgs.join(" ")}`,
      };
  }
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {
    force: false,
    skipDeps: false,
    skipAuthGenerate: false,
    dryRun: false,
    help: false,
    strict: false,
    skipInstall: false,
    installTimeout: DEFAULT_INSTALL_TIMEOUT_MS,
    packageManager: "bun",
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--force":
        flags.force = true;
        break;
      case "--skip-deps":
        flags.skipDeps = true;
        break;
      case "--skip-install":
        flags.skipInstall = true;
        break;
      case "--skip-auth-generate":
        flags.skipAuthGenerate = true;
        break;
      case "--strict":
        flags.strict = true;
        break;
      case "--dry-run":
        flags.dryRun = true;
        break;
      case "--package-manager": {
        const next = argv[i + 1];
        if (!next) throw new Error("--package-manager requires a value: bun | npm | pnpm | yarn");
        if (!(VALID_PACKAGE_MANAGERS as readonly string[]).includes(next)) {
          throw new Error(
            `--package-manager must be one of: ${VALID_PACKAGE_MANAGERS.join(", ")} (got: ${next})`,
          );
        }
        flags.packageManager = next as PackageManagerChoice;
        i++;
        break;
      }
      case "--install-timeout": {
        const next = argv[i + 1];
        if (!next) throw new Error("--install-timeout requires a value in seconds");
        const seconds = Number(next);
        if (!Number.isFinite(seconds) || seconds <= 0) {
          throw new Error(`--install-timeout must be a positive number of seconds, got: ${next}`);
        }
        flags.installTimeout = seconds * 1000;
        i++;
        break;
      }
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

Translates a freshly-scaffolded Hono project into the full hono-template.

${c(BOLD, "Usage:")}
  bun run setup [flags]

${c(BOLD, "Flags:")}
  ${c(CYAN, "--force")}                    Overwrite existing files
  ${c(CYAN, "--skip-deps")}                Don't modify or install dependencies
  ${c(CYAN, "--skip-install")}             Write package.json but don't run the install
  ${c(CYAN, "--skip-auth-generate")}       Don't prompt for \`better-auth generate\`
  ${c(CYAN, "--strict")}                   Abort on first install failure (old behavior)
  ${c(CYAN, "--dry-run")}                  Print actions without writing anything
  ${c(CYAN, "--package-manager <pm>")}     Use bun | npm | pnpm | yarn (default: bun)
  ${c(CYAN, "--install-timeout <seconds>")}  Override the 180s install timeout
  ${c(CYAN, "-h, --help")}                 Show this help
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
    shell: IS_WIN,
    windowsVerbatimArguments: false,
  });
  return result.status ?? 1;
}

type CmdResult = {
  code: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

function runCmdAsyncWithTimeout(
  cmd: string,
  args: string[],
  timeoutMs: number,
): Promise<CmdResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: CWD,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CI: "1" },
      shell: IS_WIN,
      windowsVerbatimArguments: false,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let killed = false;

    const killTree = () => {
      if (killed) return;
      killed = true;
      if (IS_WIN) {
        try {
          spawnSync("taskkill", ["/pid", String(child.pid), "/f", "/t"], { stdio: "ignore" });
        } catch {
          child.kill();
        }
      } else {
        child.kill("SIGTERM");
        setTimeout(() => {
          if (!child.killed) child.kill("SIGKILL");
        }, 2000).unref();
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      killTree();
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      stderr += `\nspawn error: ${err.message}\n`;
      resolve({ code: 1, stdout, stderr, timedOut });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr, timedOut });
    });
  });
}

function tail(text: string, lines: number): string {
  const arr = text.split(/\r?\n/);
  if (arr.length <= lines) return text.trim();
  return arr.slice(-lines).join("\n").trim();
}

async function fetchLatestVersion(pkg: string, fallback: string): Promise<string> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${pkg.replace("/", "%2F")}/latest`, {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = (await res.json()) as { version?: string };
      if (data?.version) {
        return `^${data.version}`;
      }
    }
  } catch {
  }
  return fallback;
}

async function resolveDependencyRanges() {
  const runtimeEntries = await Promise.all(
    Object.entries(FALLBACK_DEPENDENCY_RANGES.runtime).map(async ([pkg, fallback]) => {
      const version = await fetchLatestVersion(pkg, fallback);
      return [pkg, version] as const;
    }),
  );

  const devEntries = await Promise.all(
    Object.entries(FALLBACK_DEPENDENCY_RANGES.dev).map(async ([pkg, fallback]) => {
      const version = await fetchLatestVersion(pkg, fallback);
      return [pkg, version] as const;
    }),
  );

  return {
    runtime: Object.fromEntries(runtimeEntries) as Record<
      keyof typeof FALLBACK_DEPENDENCY_RANGES.runtime,
      string
    >,
    dev: Object.fromEntries(devEntries) as Record<
      keyof typeof FALLBACK_DEPENDENCY_RANGES.dev,
      string
    >,
  };
}

async function checkPrereqs(pm: PackageManager): Promise<void> {
  console.log(header("Prerequisites"));

  const pmLabel = pm.name === "bun" ? "Bun" : pm.name;
  if (!commandExists(pm.name)) {
    throw new Error(
      `${pmLabel} is required. Install: https://${pm.name === "bun" ? "bun.sh" : `${pm.name}js.com`}`,
    );
  }
  console.log(ok(pmLabel));

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

async function installDeps(flags: Flags, pm: PackageManager): Promise<{ failed: string[] }> {
  if (flags.skipDeps) {
    console.log(skip("--skip-deps: skipping dependency install"));
    return { failed: [] };
  }
  console.log(header("Installing dependencies"));

  if (flags.skipInstall) {
    console.log(skip("--skip-install: package.json updated, skipping install"));
    return { failed: [] };
  }

  const totalRuntime = DEPENDENCIES.runtime.length;
  const totalDev = DEPENDENCIES.dev.length;
  const bulk = pm.bulk();
  console.log(
    info(
      `Running \`${bulk.cmd} ${bulk.args.join(" ")}\` (${totalRuntime} runtime + ${totalDev} dev)…`,
    ),
  );

  if (flags.dryRun) {
    console.log(`  ${c(DIM, `${bulk.cmd} ${bulk.args.join(" ")}`)}`);
    return { failed: [] };
  }

  const result = await runCmdAsyncWithTimeout(bulk.cmd, bulk.args, flags.installTimeout);

  if (result.code === 0 && !result.timedOut) {
    console.log(ok(`installed ${totalRuntime + totalDev} packages`));
    return { failed: [] };
  }

  const reason = result.timedOut
    ? `timed out after ${Math.round(flags.installTimeout / 1000)}s`
    : `exited with code ${result.code}`;
  console.log(
    warn(
      `\`${pm.name} install\` ${reason} — falling back to per-package install to identify the culprit`,
    ),
  );
  if (result.stderr.trim()) {
    console.log(c(DIM, tail(result.stderr, 20)));
  }

  if (flags.strict) {
    throw new Error(`${pm.name} install ${reason}`);
  }

  const failed = await perPackageFallback(pm);
  return { failed };
}

async function perPackageFallback(pm: PackageManager): Promise<string[]> {
  console.log(header("Per-package fallback"));
  const failed: string[] = [];
  for (const kind of ["runtime", "dev"] as const) {
    const pkgs = DEPENDENCIES[kind];
    for (const pkg of pkgs) {
      const inv = pm.add(pkg, kind === "dev");
      const result = await runCmdAsyncWithTimeout(inv.cmd, inv.args, PER_PACKAGE_TIMEOUT_MS);
      if (result.code === 0 && !result.timedOut) {
        continue;
      }
      const reason = result.timedOut ? "timed out" : `exit ${result.code}`;
      failed.push(pkg);
      console.log(fail(`${pkg} (${reason})`));
      if (result.stderr.trim()) {
        const hint = KNOWN_TROUBLEMAKERS[pkg];
        console.log(`  ${c(DIM, tail(result.stderr, 6))}`);
        if (hint) console.log(`  ${c(YELLOW, `hint: ${hint}`)}`);
      }
    }
  }
  return failed;
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

async function mergeDependencies(
  flags: Flags,
  dependencyRanges: { runtime: Record<string, string>; dev: Record<string, string> },
): Promise<void> {
  console.log(header("Merging package.json"));
  const pkgPath = join(CWD, "package.json");
  const raw = await readFile(pkgPath, "utf8");
  const pkg = JSON.parse(raw) as PackageJson;

  pkg.dependencies = { ...pkg.dependencies, ...dependencyRanges.runtime };
  pkg.devDependencies = { ...pkg.devDependencies, ...dependencyRanges.dev };
  pkg.scripts = { ...pkg.scripts, ...PACKAGE_JSON_PATCH.scripts };
  pkg["lint-staged"] = { ...pkg["lint-staged"], ...PACKAGE_JSON_PATCH["lint-staged"] };

  if (!pkg.type) pkg.type = "module";

  if (flags.dryRun) {
    console.log(
      info(
        `would merge ${DEPENDENCIES.runtime.length} runtime + ${DEPENDENCIES.dev.length} dev deps, scripts, lint-staged into package.json`,
      ),
    );
    return;
  }

  const formatted = `${JSON.stringify(pkg, null, 2)}\n`;
  await writeFile(pkgPath, formatted, "utf8");
  console.log(
    ok(
      `package.json: +${DEPENDENCIES.runtime.length} runtime, +${DEPENDENCIES.dev.length} dev, scripts, lint-staged`,
    ),
  );
}

async function initHusky(flags: Flags, pm: PackageManager): Promise<void> {
  console.log(header("Initializing Husky"));
  if ((await pathExists(join(CWD, ".husky/pre-commit"))) && !flags.force) {
    console.log(skip(".husky/pre-commit already exists"));
    return;
  }
  if (flags.dryRun) {
    const inv = pm.exec(["husky", "init"]);
    console.log(info(`would run \`${inv.cmd} ${inv.args.join(" ")}\``));
    return;
  }
  const inv = pm.exec(["husky", "init"]);
  const code = runCmd(inv.cmd, inv.args, { inherit: true });
  if (code !== 0) {
    console.log(warn(`husky init exited with code ${code} — ensure .husky/pre-commit exists`));
  } else {
    console.log(ok("husky initialized"));
  }
}

async function promptAuthGenerate(flags: Flags, pm: PackageManager): Promise<void> {
  if (flags.skipAuthGenerate) {
    console.log(skip("--skip-auth-generate: skipping better-auth generate"));
    return;
  }
  const inv = pm.exec(["@better-auth/cli@latest", "generate"]);
  const manualCmd = `${inv.cmd} ${inv.args.join(" ")}`;
  console.log(header("Better Auth schema generation"));
  console.log(
    info("Better Auth needs its tables in your database. Run these once your models are defined:"),
  );
  console.log(`\n  ${c(CYAN, manualCmd)}\n  ${c(CYAN, "bunx drizzle-kit push")}\n`);

  if (!input.isTTY) {
    console.log(skip("non-interactive shell — skipping prompt"));
    return;
  }
  if (flags.dryRun) return;

  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question(`Run \`${manualCmd}\` now? [y/N] `)).trim().toLowerCase();
    if (answer === "y" || answer === "yes") {
      runCmd(inv.cmd, inv.args, { inherit: true });
    } else {
      console.log(skip("skipped — run it manually when ready"));
    }
  } finally {
    rl.close();
  }
}

function printSummary(
  projectName: string,
  wrote: number,
  skipped: number,
  failedPackages: string[],
  flags: Flags,
  pm: PackageManager,
): void {
  console.log(header("Summary"));
  console.log(`${ok(`${c(BOLD, projectName)} is configured`)}`);
  console.log(
    `  ${c(DIM, `wrote: ${wrote} • skipped: ${skipped} • dry-run: ${flags.dryRun} • pm: ${pm.name}`)}`,
  );

  if (failedPackages.length > 0) {
    console.log(header("Failed packages"));
    console.log(
      warn(`${failedPackages.length} package(s) could not be installed. Retry manually:`),
    );
    for (const pkg of failedPackages) {
      console.log(`  ${fail(pkg)}`);
      const hint = KNOWN_TROUBLEMAKERS[pkg];
      if (hint) console.log(`    ${c(YELLOW, hint)}`);
    }
    console.log(`\n  ${c(CYAN, pm.addHint(failedPackages))}\n`);
  }

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
  let flags: Flags;
  try {
    flags = parseFlags(process.argv.slice(2));
  } catch (err) {
    console.error(fail(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
  if (flags.help) {
    printHelp();
    return;
  }

  console.log(`${c(BOLD, c(MAGENTA, "▲ hono-template setup"))} ${c(DIM, `→ ${CWD}`)}\n`);

  const pm = makePackageManager(flags.packageManager);

  try {
    await checkPrereqs(pm);
    const { name } = await verifyHonoProject();
    console.log(info(`detected project: ${c(BOLD, name)}`));

    const dependencyRanges = await resolveDependencyRanges();
    await mergeDependencies(flags, dependencyRanges);
    const { failed } = await installDeps(flags, pm);
    const { wrote, skipped } = await writeStubs(flags);
    await initHusky(flags, pm);
    await promptAuthGenerate(flags, pm);

    printSummary(name, wrote, skipped, failed, flags, pm);
  } catch (err) {
    console.error(`\n${fail(err instanceof Error ? err.message : String(err))}`);
    process.exit(1);
  }
}

await main();
