import { join } from "node:path";
import { fileExists, readFileSafe, writeFileSafe } from "./fs.js";

export interface PackageJsonStructure {
  name?: string;
  version?: string;
  private?: boolean;
  type?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

export async function readPackageJson(projectDir: string): Promise<PackageJsonStructure> {
  const pkgPath = join(projectDir, "package.json");
  if (!(await fileExists(pkgPath))) {
    return {
      name: "my-hono-app",
      version: "0.0.1",
      type: "module",
      scripts: {},
      dependencies: {},
      devDependencies: {},
    };
  }

  const raw = await readFileSafe(pkgPath, "{}");
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as PackageJsonStructure;
    }
  } catch {
    // fallback
  }

  return {
    name: "my-hono-app",
    version: "0.0.1",
    type: "module",
    scripts: {},
    dependencies: {},
    devDependencies: {},
  };
}

export async function mergePackageJson(
  projectDir: string,
  additions: {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }
): Promise<void> {
  const current = await readPackageJson(projectDir);

  const updated: PackageJsonStructure = {
    ...current,
    scripts: {
      ...(current.scripts ?? {}),
      ...(additions.scripts ?? {}),
    },
    dependencies: sortObjectKeys({
      ...(current.dependencies ?? {}),
      ...(additions.dependencies ?? {}),
    }),
    devDependencies: sortObjectKeys({
      ...(current.devDependencies ?? {}),
      ...(additions.devDependencies ?? {}),
    }),
  };

  const pkgPath = join(projectDir, "package.json");
  await writeFileSafe(pkgPath, `${JSON.stringify(updated, null, 2)}\n`);
}

function sortObjectKeys(obj: Record<string, string>): Record<string, string> {
  const sorted: Record<string, string> = {};
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  for (const key of keys) {
    const val = obj[key];
    if (val !== undefined) {
      sorted[key] = val;
    }
  }
  return sorted;
}
