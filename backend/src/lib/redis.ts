import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

export const redis = redisUrl ? new Redis(redisUrl) : null;

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function setCache(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
  if (!redis) return;
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}
