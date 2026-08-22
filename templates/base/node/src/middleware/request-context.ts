import type { MiddlewareHandler } from "hono";
import { requestContext } from "../core/request-context.js";
import { logger } from "../core/logger.js";

export const requestContextMiddleware: MiddlewareHandler = async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  const startTime = performance.now();

  c.header("x-request-id", requestId);

  await requestContext.run(
    {
      requestId,
      startTime,
    },
    async () => {
      logger.info({
        msg: "Incoming request",
        method: c.req.method,
        path: c.req.path,
        requestId,
      });

      await next();

      const durationMs = Math.round(performance.now() - startTime);
      c.header("x-response-time", `${durationMs}ms`);

      logger.info({
        msg: "Request completed",
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs,
        requestId,
      });
    }
  );
};
