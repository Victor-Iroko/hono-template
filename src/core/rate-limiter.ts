import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis.js";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { Variables } from "../index.js";
import { badRequestError, rateLimitedError } from "./errors.js";
import { differenceInSeconds } from "date-fns";

type RateLimitKeyExtractor = (c: Context<{ Variables: Variables }>) => string;

interface RateLimitOptions {
  limit: number;
  window: number;
  key?: "ip" | "userId" | RateLimitKeyExtractor;
  prefix?: string;
}

export function createRatelimit(opts: RateLimitOptions) {
  const { limit, window, key = "ip", prefix = "ratelimit" } = opts;

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${window}s`),
    analytics: true,
    prefix,
  });

  const extractKey: RateLimitKeyExtractor =
    key === "ip"
      ? (c) => c.req.header("x-forwarded-for") ?? "unknown"
      : key === "userId"
        ? (c) => {
            const user = c.get("user");
            if (!user?.id)
              throw badRequestError(
                "user not set — ensure auth middleware runs before rate limiter",
              );
            return user.id;
          }
        : key;

  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const identifier = extractKey(c);
    const { success, remaining, limit: rateLimit, reset } = await ratelimit.limit(identifier);

    c.header("X-RateLimit-Limit", String(rateLimit));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(reset));

    if (!success) {
      const retryAfter = Math.max(
        1,
        differenceInSeconds(reset, Date.now(), { roundingMethod: "ceil" }),
      );
      throw rateLimitedError(retryAfter, rateLimit, window, "Rate limit exceeded");
    }

    await next();
  });
}

export const globalRatelimit = createRatelimit({
  limit: 300,
  window: 60,
  key: "ip",
  prefix: "ratelimit",
});
