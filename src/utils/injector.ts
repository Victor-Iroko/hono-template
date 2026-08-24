import { join } from "node:path";
import { fileExists, readFileSafe, writeFileSafe } from "./fs.js";

export async function injectAtMarker(
  projectDir: string,
  relativePath: string,
  marker: string,
  contentToInject: string
): Promise<boolean> {
  const filePath = join(projectDir, relativePath);
  if (!(await fileExists(filePath))) {
    return false;
  }

  const fileContent = await readFileSafe(filePath);
  if (!fileContent.includes(marker)) {
    return false;
  }

  // Avoid duplicate injection
  if (fileContent.includes(contentToInject.trim())) {
    return true;
  }

  const replacement = `${marker}\n${contentToInject}`;
  const newContent = fileContent.replace(marker, replacement);
  await writeFileSafe(filePath, newContent);
  return true;
}

export async function prependImports(
  projectDir: string,
  relativePath: string,
  importStatements: string
): Promise<boolean> {
  const filePath = join(projectDir, relativePath);
  if (!(await fileExists(filePath))) {
    return false;
  }

  const fileContent = await readFileSafe(filePath);
  if (fileContent.includes(importStatements.trim())) {
    return true;
  }

  const newContent = `${importStatements.trim()}\n${fileContent}`;
  await writeFileSafe(filePath, newContent);
  return true;
}

export async function replaceMarkerBlock(
  projectDir: string,
  relativePath: string,
  startMarker: string,
  endMarker: string,
  replacementContent: string
): Promise<boolean> {
  const filePath = join(projectDir, relativePath);
  if (!(await fileExists(filePath))) {
    return false;
  }

  const fileContent = await readFileSafe(filePath);
  const startIndex = fileContent.indexOf(startMarker);
  const endIndex = fileContent.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return false;
  }

  const before = fileContent.substring(0, startIndex);
  const after = fileContent.substring(endIndex + endMarker.length);
  const newContent = `${before}${startMarker}\n${replacementContent.trim()}\n${endMarker}${after}`;

  await writeFileSafe(filePath, newContent);
  return true;
}

