#!/usr/bin/env bun
import * as p from "@clack/prompts";
import pc from "picocolors";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { parseCliFlags } from "./cli/flags.js";
import { promptProjectOptions } from "./cli/prompts.js";
import { runInstallers } from "./installers/index.js";
import { runInstall } from "./utils/package-manager.js";
import { fileExists } from "./utils/fs.js";

async function main(): Promise<void> {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const templateRoot = resolve(currentDir, "../templates");

  const { projectName, flags } = parseCliFlags(process.argv);

  if (flags.dryRun) {
    p.intro(pc.yellow("DRY RUN MODE: No files will be created or modified."));
  }

  const options = await promptProjectOptions(projectName, flags);

  if (await fileExists(options.projectDir)) {
    if (!flags.force && !flags.nonInteractive && options.projectDir !== process.cwd()) {
      const shouldOverwrite = await p.confirm({
        message: `Directory ${pc.cyan(options.projectName)} already exists. Overwrite files?`,
        initialValue: false,
      });

      if (p.isCancel(shouldOverwrite) || !shouldOverwrite) {
        p.cancel("Operation cancelled.");
        process.exit(0);
      }
    }
  }

  const s = p.spinner();

  if (!flags.dryRun) {
    s.start(`Scaffolding ${pc.cyan(options.projectName)} with Hono...`);
    try {
      await runInstallers({
        options,
        templateRoot,
        projectDir: options.projectDir,
      });
      s.stop(`Successfully scaffolded ${pc.green(options.projectName)}!`);
    } catch (err: unknown) {
      s.stop(pc.red("Failed to scaffold project."));
      console.error(err);
      process.exit(1);
    }

    if (options.git) {
      const gitSpinner = p.spinner();
      gitSpinner.start("Initializing Git repository...");
      try {
        await initGit(options.projectDir);
        gitSpinner.stop("Git repository initialized.");
      } catch {
        gitSpinner.stop(pc.yellow("Skipped Git initialization."));
      }
    }

    if (options.installDeps) {
      const installSpinner = p.spinner();
      installSpinner.start(`Installing dependencies with ${pc.cyan(options.packageManager)}...`);
      const result = await runInstall(options.projectDir, options.packageManager);
      if (result.success) {
        installSpinner.stop("Dependencies installed successfully!");
      } else {
        installSpinner.stop(pc.yellow(`Failed to install dependencies: ${result.error ?? "Unknown error"}`));
      }
    }
  }

  printSuccessSummary(options);
}

function initGit(projectDir: string): Promise<boolean> {
  return new Promise((res) => {
    const child = spawn("git", ["init"], { cwd: projectDir, stdio: "ignore" });
    child.on("close", (code) => res(code === 0));
    child.on("error", () => res(false));
  });
}

function printSuccessSummary(options: {
  projectName: string;
  projectDir: string;
  packageManager: string;
  db: string;
  storage: string;
  redis: string;
}): void {
  const isCurrentDir = options.projectDir === process.cwd();
  const nextSteps: string[] = [];

  if (!isCurrentDir) {
    nextSteps.push(`cd ${options.projectName}`);
  }

  if (options.db !== "none" || options.redis !== "none" || options.storage !== "none") {
    nextSteps.push("docker compose up -d");
  }

  if (options.db !== "none") {
    nextSteps.push(`${options.packageManager} run db:push`);
  }

  nextSteps.push(`${options.packageManager} run dev`);

  p.note(
    nextSteps.map((step, i) => `${pc.bold(pc.cyan(`${i + 1}.`))} ${step}`).join("\n"),
    "Next Steps"
  );

  p.outro(pc.bold(pc.green("All set! Happy hacking with Hono! 🎉")));
}

main().catch((err: unknown) => {
  console.error(pc.red("Unexpected error:"), err);
  process.exit(1);
});
