import { redis } from "./redis.js";

const BASE = "cache:";
const DEFAULT_TTL = 3600;

const prefix = (k: string) => `${BASE}${k}`;

export const cache = {
  async get<T = unknown>(k: string): Promise<T | null> {
    return redis.get<T>(prefix(k));
  },
  async set<T>(k: string, value: T, opts?: { ex?: number }): Promise<void> {
    const ttl = opts?.ex ?? DEFAULT_TTL;
    await redis.set(prefix(k), value, { ex: ttl });
  },
  async del(k: string): Promise<void> {
    await redis.del(prefix(k));
  },
};
