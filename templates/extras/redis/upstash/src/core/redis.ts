import { Redis } from "@upstash/redis";
import { env } from "./env-validation.js";

let _redis: Redis | undefined;

export function getRedis(): Redis {
  return (
    _redis ??= new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  );
}

export const redis = new Proxy({} as Redis, {
  get: (_, prop: string | symbol, receiver: unknown) => {
    const target = getRedis();
    const value = Reflect.get(target, prop, receiver);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
  },
  has: (_, prop: string | symbol) => Reflect.has(getRedis(), prop),
  ownKeys: () => Reflect.ownKeys(getRedis()),
  getOwnPropertyDescriptor: (_, prop: string | symbol) => Reflect.getOwnPropertyDescriptor(getRedis(), prop),
});
