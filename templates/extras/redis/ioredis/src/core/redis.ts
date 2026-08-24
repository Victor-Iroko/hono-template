import { Redis } from "ioredis";
import { getEnv } from "./env-validation.js";

let _redis: Redis | undefined;

export function getRedis(): Redis {
  return (
    _redis ??= new Redis(getEnv().REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
  );
}

export type { Redis };
