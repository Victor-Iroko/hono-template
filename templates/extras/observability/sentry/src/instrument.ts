import * as Sentry from "@sentry/node";

let _isInitialized = false;

export function initializeInstrumentation(): void {
  if (_isInitialized) return;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    tracesSampleRate: process.env.APP_ENV === "production" ? 0.2 : 1.0,
    environment: process.env.APP_ENV || "development",
  });

  _isInitialized = true;
}

export function isInstrumentationInitialized(): boolean {
  return _isInitialized;
}
