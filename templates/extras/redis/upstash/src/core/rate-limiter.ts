import type { MiddlewareHandler } from "hono";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis.js";
import { rateLimitedError } from "./errors.js";

let _ratelimit: Ratelimit | undefined;

export function getRateLimiter(): Ratelimit {
  return (
    _ratelimit ??= new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: true,
      prefix: "@app/ratelimit",
    })
  );
}

export const rateLimiterMiddleware = (customLimiter?: Ratelimit): MiddlewareHandler => {
  return async (c, next) => {
    const limiter = customLimiter ?? getRateLimiter();
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
    const { success, limit, remaining, reset } = await limiter.limit(ip);

    c.header("X-RateLimit-Limit", limit.toString());
    c.header("X-RateLimit-Remaining", remaining.toString());
    c.header("X-RateLimit-Reset", reset.toString());

    if (!success) {
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      throw rateLimitedError(retryAfter, limit, 60);
    }

    await next();
  };
};

export const globalRatelimit = rateLimiterMiddleware();
