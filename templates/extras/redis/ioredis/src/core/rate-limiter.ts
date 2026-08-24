import type { MiddlewareHandler } from "hono";
import { getRedis } from "./redis.js";
import { rateLimitedError } from "./errors.js";

export const slidingWindowRateLimiter = (
  limit = 60,
  windowSeconds = 60,
  prefix = "@app/ratelimit"
): MiddlewareHandler => {
  return async (c, next) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
    const key = `${prefix}:${ip}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    const pipeline = getRedis().pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();
    const requestCount = (results?.[2]?.[1] as number) ?? 1;

    const remaining = Math.max(0, limit - requestCount);
    const resetTime = Math.ceil(now / 1000) + windowSeconds;

    c.header("X-RateLimit-Limit", limit.toString());
    c.header("X-RateLimit-Remaining", remaining.toString());
    c.header("X-RateLimit-Reset", resetTime.toString());

    if (requestCount > limit) {
      throw rateLimitedError(windowSeconds, limit, windowSeconds);
    }

    await next();
  };
};

export const globalRatelimit = slidingWindowRateLimiter();
