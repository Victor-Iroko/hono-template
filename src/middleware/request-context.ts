import { logger } from "../core/logger.js";
import { createMiddleware } from "hono/factory";
import type { Variables } from "../index.js";
import { routePath } from "hono/route";
import { runWithRequestContext } from "../core/request-context.js";

export const requestLifecycle = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  const correlationId = c.req.header("x-correlation-id") ?? requestId;
  const childLogger = logger.child({ requestId, correlationId });

  c.set("requestId", requestId);
  c.set("correlationId", correlationId);
  c.set("logger", childLogger);

  const method = c.req.method;
  const url = c.req.url;
  const path = c.req.path;
  const start = performance.now();

  childLogger.info({ method, url, path }, "Request started");

  return runWithRequestContext({ requestId, correlationId, logger: childLogger }, async () => {
    try {
      await next();
    } catch (err) {
      childLogger.error({ err, method, url, path }, "Unhandled request error");
      throw err;
    } finally {
      const durationMs = performance.now() - start;
      const status = c.res.status;
      const route = routePath(c) || path;
      childLogger.info(
        {
          method,
          url,
          path,
          route,
          status,
          durationMs: Math.round(durationMs * 100) / 100,
        },
        "Request completed",
      );
      c.header("x-request-id", requestId);
      c.header("x-correlation-id", correlationId);
    }
  });
});
