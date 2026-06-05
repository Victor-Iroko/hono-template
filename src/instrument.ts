import * as Sentry from "@sentry/hono/node";
import env from "./core/env.js";
import { logger } from "./core/logger.js";

let initialized = false;
if (!initialized) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.APP_ENV,
    tracesSampleRate: env.APP_ENV === "production" ? 0.2 : 1.0,
    enabled: env.APP_ENV === "production" || !!env.SENTRY_DSN,
  });
  initialized = true;
}

logger.info({ dsn: env.SENTRY_DSN ? "configured" : "not set" }, "Sentry initialized");
