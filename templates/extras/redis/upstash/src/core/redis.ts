import { Redis } from "@upstash/redis";

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || "http://localhost:8079",
      token: process.env.UPSTASH_REDIS_REST_TOKEN || "local-dev-token",
    });
  }
  return redisInstance;
}

export const redis = new Proxy({} as Redis, {
  get: (_, prop: string | symbol, receiver: unknown) => {
    const target = getRedis();
    const value = Reflect.get(target, prop, receiver);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
  },
  has: (_, prop: string | symbol) => {
    return Reflect.has(getRedis(), prop);
  },
  ownKeys: () => {
    return Reflect.ownKeys(getRedis());
  },
  getOwnPropertyDescriptor: (_, prop: string | symbol) => {
    return Reflect.getOwnPropertyDescriptor(getRedis(), prop);
  },
});
