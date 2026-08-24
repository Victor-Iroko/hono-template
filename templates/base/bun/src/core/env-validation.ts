import { z } from "zod";
import { envSchema, type Env } from "./env-schema.js";

let _env: Env | undefined;

export function getEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Environment validation failed:\n" + z.prettifyError(result.error));
    process.exit(1);
  }

  return (_env = result.data);
}

export const validateEnv = getEnv;
