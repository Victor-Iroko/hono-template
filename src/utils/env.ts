import { join } from "node:path";
import { readFileSafe, writeFileSafe } from "./fs.js";

export async function appendEnvVars(
  projectDir: string,
  envVars: {
    env?: Record<string, string>;
    example?: Record<string, string>;
    test?: Record<string, string>;
    comments?: string[];
  }
): Promise<void> {
  const envPath = join(projectDir, ".env");
  const examplePath = join(projectDir, ".env.example");
  const testPath = join(projectDir, ".env.test");

  if (envVars.env) {
    await updateEnvFile(envPath, envVars.env, envVars.comments);
  }
  if (envVars.example) {
    await updateEnvFile(examplePath, envVars.example, envVars.comments);
  }
  if (envVars.test) {
    await updateEnvFile(testPath, envVars.test, envVars.comments);
  }
}

async function updateEnvFile(
  filePath: string,
  variables: Record<string, string>,
  comments?: string[]
): Promise<void> {
  const existing = await readFileSafe(filePath, "");
  const lines = existing.length > 0 ? existing.split("\n") : [];

  const existingKeys = new Set<string>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        existingKeys.add(trimmed.slice(0, eqIdx).trim());
      }
    }
  }

  const additions: string[] = [];
  if (comments && comments.length > 0) {
    additions.push("");
    for (const comment of comments) {
      additions.push(comment.startsWith("#") ? comment : `# ${comment}`);
    }
  }

  let hasAdded = false;
  for (const [key, value] of Object.entries(variables)) {
    if (!existingKeys.has(key)) {
      additions.push(`${key}=${value}`);
      hasAdded = true;
    }
  }

  if (hasAdded || (comments && comments.length > 0)) {
    const newContent = (existing ? `${existing.trimEnd()}\n` : "") + additions.join("\n") + "\n";
    await writeFileSafe(filePath, newContent);
  }
}
