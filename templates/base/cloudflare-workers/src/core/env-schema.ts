import { z } from "zod";

export const envSchema = z.object({
  APP_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  // [INSTALLER:ENV_SCHEMA]
});

export type Env = z.infer<typeof envSchema>;
