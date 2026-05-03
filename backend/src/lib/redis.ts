import Redis from "ioredis";
import pino from "pino";

const logger = pino();
const redisUrl = process.env.REDIS_URL;

export const redis = redisUrl ? new Redis(redisUrl) : null;

if (redis) {
  redis.on("error", (err) => logger.error({ err: err.message }, "[REDIS] Connection error — Redis operations will fail gracefully"));
  redis.on("connect", () => logger.info("[REDIS] Connected successfully"));
  redis.on("reconnecting", () => logger.warn("[REDIS] Reconnecting..."));
}

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Silently fail — cache misses are acceptable
  }
}
