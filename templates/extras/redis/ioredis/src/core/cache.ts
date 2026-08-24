import { getRedis } from "./redis.js";

export const cache = {
  get: async <T>(key: string): Promise<T | null> => {
    const data = await getRedis().get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  },
  set: async <T>(key: string, value: T, ttlSeconds?: number): Promise<void> => {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await getRedis().set(key, serialized, "EX", ttlSeconds);
    } else {
      await getRedis().set(key, serialized);
    }
  },
  del: async (key: string): Promise<void> => {
    await getRedis().del(key);
  },
  remember: async <T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>
  ): Promise<T> => {
    const existing = await cache.get<T>(key);
    if (existing !== null && existing !== undefined) {
      return existing;
    }
    const fresh = await factory();
    await cache.set(key, fresh, ttlSeconds);
    return fresh;
  },
};
