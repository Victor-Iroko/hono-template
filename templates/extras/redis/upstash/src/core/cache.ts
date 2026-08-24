import { getRedis } from "./redis.js";

export const cache = {
  get: async <T>(key: string): Promise<T | null> => {
    return await getRedis().get<T>(key);
  },
  set: async <T>(key: string, value: T, ttlSeconds?: number): Promise<void> => {
    if (ttlSeconds) {
      await getRedis().set(key, value, { ex: ttlSeconds });
    } else {
      await getRedis().set(key, value);
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
