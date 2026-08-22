import type { ErrorHandler, NotFoundHandler } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { AppError } from "./errors.js";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    c.status(err.statusCode as StatusCode);
    return c.json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  console.error("Unhandled error:", err);
  c.status(500);
  return c.json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
};

export const notFoundHandler: NotFoundHandler = (c) => {
  c.status(404);
  return c.json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route not found: ${c.req.method} ${c.req.path}`,
    },
  });
};
