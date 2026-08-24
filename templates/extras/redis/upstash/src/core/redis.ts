import { Redis } from "@upstash/redis";
import { getEnv } from "./env-validation.js";

let _redis: Redis | undefined;

export function getRedis(): Redis {
  return (
    _redis ??= new Redis({
      url: getEnv().UPSTASH_REDIS_REST_URL,
      token: getEnv().UPSTASH_REDIS_REST_TOKEN,
    })
  );
}

export type { Redis };
