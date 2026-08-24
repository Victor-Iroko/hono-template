import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";

export type ErrorCode =
  | "bad_request"
  | "validation_error"
  | "unauthorized"
  | "permission_denied"
  | "not_found"
  | "conflict"
  | "rate_limit_exceeded"
  | "external_service_error"
  | "internal_error";

export class AppError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: ErrorCode;
  readonly meta?: Record<string, unknown>;
  readonly headers?: Record<string, string>;
  readonly expose: boolean;
  readonly retryable: boolean;

  constructor(params: {
    status: ContentfulStatusCode;
    code: ErrorCode;
    message: string;
    meta?: Record<string, unknown>;
    headers?: Record<string, string>;
    expose?: boolean;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(params.message, { cause: params.cause });
    this.name = "AppError";
    this.status = params.status;
    this.code = params.code;
    this.meta = params.meta;
    this.headers = params.headers;
    this.expose = params.expose ?? true;
    this.retryable = params.retryable ?? false;
  }
}

export const badRequestError = (message = "Bad request", meta?: Record<string, unknown>) =>
  new AppError({
    status: 400,
    code: "bad_request",
    message,
    meta,
  });

export const validationError = (message = "Validation failed", meta?: Record<string, unknown>) =>
  new AppError({
    status: 422,
    code: "validation_error",
    message,
    meta,
  });

export const unauthorizedError = (message = "Unauthorized", meta?: Record<string, unknown>) =>
  new AppError({
    status: 401,
    code: "unauthorized",
    message,
    meta,
    headers: { "WWW-Authenticate": "Bearer" },
  });

export const permissionDeniedError = (message = "Permission denied") =>
  new AppError({
    status: 403,
    code: "permission_denied",
    message,
  });

export const notFoundError = (message = "Resource not found") =>
  new AppError({
    status: 404,
    code: "not_found",
    message,
  });

export const conflictError = (message = "Conflict", meta?: Record<string, unknown>) =>
  new AppError({
    status: 409,
    code: "conflict",
    message,
    meta,
  });

export const rateLimitedError = (
  retryAfter: number,
  limit: number,
  windowSeconds: number,
  message = "Rate limit exceeded"
) =>
  new AppError({
    status: 429,
    code: "rate_limit_exceeded",
    message,
    headers: {
      "Retry-After": String(retryAfter),
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + retryAfter),
    },
    meta: { retryAfter, limit, windowSeconds },
    retryable: true,
  });

export const externalServiceError = (
  message = "External service unavailable",
  meta?: Record<string, unknown>
) =>
  new AppError({
    status: 502,
    code: "external_service_error",
    message,
    meta,
    retryable: true,
  });

export const internalError = (message = "Internal server error", cause?: unknown) =>
  new AppError({
    status: 500,
    code: "internal_error",
    message,
    expose: false,
    cause,
  });

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return validationError("Validation failed", { issues: error.issues });
  }

  if (error instanceof SyntaxError && "body" in error) {
    return badRequestError("Invalid JSON payload");
  }

  return internalError(error instanceof Error ? error.message : "An unexpected error occurred", error);
}

export function serializeError(error: AppError, requestId?: string) {
  return {
    error: {
      code: error.code,
      message: error.expose ? error.message : "Internal server error",
      ...(error.meta ? { meta: error.meta } : {}),
      ...(requestId ? { requestId } : {}),
    },
  };
}
