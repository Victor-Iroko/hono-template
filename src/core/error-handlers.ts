import * as Sentry from "@sentry/hono/node";
import type { Context } from "hono";

import { normalizeError, serializeError } from "./errors.js";
import type { Variables } from "../index.js";

export function onErrorHandler(error: unknown, c: Context<{ Variables: Variables }>) {
  const err = normalizeError(error);
  const requestId = c.get("requestId");
  const log = c.get("logger");

  log.error(
    {
      err: error,
      code: err.code,
      status: err.status,
      retryable: err.retryable,
    },
    err.message,
  );

  if (err.status >= 500) {
    Sentry.captureException(error);
  }

  for (const [key, value] of Object.entries(err.headers ?? {})) {
    c.header(key, value);
  }

  return c.json(serializeError(err, requestId), err.status);
}
