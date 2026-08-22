import { Redis } from "ioredis";

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    redisInstance = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
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
