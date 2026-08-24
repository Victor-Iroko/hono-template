import { access, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function readFileSafe(path: string, defaultValue: string = ""): Promise<string> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return defaultValue;
  }
}

export async function writeFileSafe(filePath: string, content: string): Promise<void> {
  await ensureDir(dirname(filePath));
  await writeFile(filePath, content, "utf-8");
}

export async function copyTemplateDir(sourceDir: string, targetDir: string): Promise<void> {
  const exists = await fileExists(sourceDir);
  if (!exists) {
    return;
  }
  await ensureDir(targetDir);
  await cp(sourceDir, targetDir, { recursive: true, force: true });
}
