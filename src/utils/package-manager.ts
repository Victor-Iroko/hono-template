import { spawn } from "node:child_process";
import type { PackageManagerChoice } from "../cli/types.js";

export function detectPackageManager(): PackageManagerChoice {
  const userAgent = process.env.npm_config_user_agent;
  if (userAgent) {
    if (userAgent.startsWith("bun")) return "bun";
    if (userAgent.startsWith("pnpm")) return "pnpm";
    if (userAgent.startsWith("yarn")) return "yarn";
    if (userAgent.startsWith("npm")) return "npm";
  }
  return "bun";
}

export function getInstallCommand(pm: PackageManagerChoice): { command: string; args: string[] } {
  switch (pm) {
    case "bun":
      return { command: "bun", args: ["install"] };
    case "pnpm":
      return { command: "pnpm", args: ["install"] };
    case "yarn":
      return { command: "yarn", args: ["install"] };
    case "npm":
      return { command: "npm", args: ["install"] };
  }
}

export async function runInstall(
  projectDir: string,
  pm: PackageManagerChoice
): Promise<{ success: boolean; error?: string }> {
  const { command, args } = getInstallCommand(pm);
  return new Promise((resolve) => {
    const isWindows = process.platform === "win32";
    const executable = isWindows ? `${command}.cmd` : command;

    const child = spawn(executable, args, {
      cwd: projectDir,
      stdio: "inherit",
      shell: isWindows,
    });

    child.on("error", (err) => {
      resolve({ success: false, error: err.message });
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: `Process exited with status code ${code}` });
      }
    });
  });
}
