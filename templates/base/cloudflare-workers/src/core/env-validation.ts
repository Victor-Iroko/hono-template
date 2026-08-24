import { z } from "zod";
import { envSchema, type Env } from "./env-schema.js";

let _env: Env | undefined;

export function initEnv(bindings: Record<string, unknown> = {}): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(bindings);
  if (!result.success) {
    console.error("❌ Environment validation failed:\n" + z.prettifyError(result.error));
    throw new Error("Environment validation failed");
  }

  return (_env = result.data);
}

export function getEnv(): Env {
  return _env ?? initEnv();
}
