import * as Sentry from "@sentry/node";
import { getEnv } from "./core/env-validation.js";

let _isInitialized = false;

export function initializeInstrumentation(): void {
  if (_isInitialized) return;

  const env = getEnv();
  const dsn = env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    tracesSampleRate: env.APP_ENV === "production" ? 0.2 : 1.0,
    environment: env.APP_ENV,
  });

  _isInitialized = true;
}

export function isInstrumentationInitialized(): boolean {
  return _isInitialized;
}
