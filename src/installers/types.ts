import type { ProjectOptions } from "../cli/types.js";

export interface InstallerContext {
  options: ProjectOptions;
  templateRoot: string;
  projectDir: string;
}

export type InstallerFn = (ctx: InstallerContext) => Promise<void>;
