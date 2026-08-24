import type { ErrorHandler, NotFoundHandler } from "hono";
import { normalizeError, serializeError } from "./errors.js";

export const errorHandler: ErrorHandler = (error, c) => {
  const err = normalizeError(error);

  console.error("Unhandled error:", error);

  for (const [key, value] of Object.entries(err.headers ?? {})) {
    c.header(key, value);
  }

  return c.json(serializeError(err), err.status);
};

export const notFoundHandler: NotFoundHandler = (c) => {
  return c.json(
    {
      error: {
        code: "not_found",
        message: `Route not found: ${c.req.method} ${c.req.path}`,
      },
    },
    404
  );
};
