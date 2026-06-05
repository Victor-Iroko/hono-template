import "dotenv/config";
import { z } from "zod/v4";

const baseSchema = z.object({
  APP_ENV: z.enum(["development", "production", "test"]).default("development"),

  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

  DATABASE_URL: z.string(),

  UPSTASH_REDIS_REST_URL: z.string(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  SENTRY_DSN: z.string().optional(),
});

const env = baseSchema.parse(process.env);

export default env;
