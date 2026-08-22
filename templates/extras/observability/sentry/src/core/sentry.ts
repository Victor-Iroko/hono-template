import * as Sentry from "@sentry/node";
import type { MiddlewareHandler } from "hono";

export const sentryMiddleware: MiddlewareHandler = async (c, next) => {
  if (!process.env.SENTRY_DSN) {
    return await next();
  }

  return await Sentry.withIsolationScope(async () => {
    Sentry.setTag("method", c.req.method);
    Sentry.setTag("url", c.req.url);

    try {
      await next();
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  });
};
