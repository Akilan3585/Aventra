import "server-only";

import { Redis } from "@upstash/redis";

let redisInstance: Redis | null = null;
let redisInitialized = false;

/**
 * Checks if Upstash Redis credentials are configured in the environment.
 */
export function isRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  return Boolean(
    url &&
      token &&
      !url.includes("REPLACE_ME") &&
      !token.includes("REPLACE_ME"),
  );
}

/**
 * Returns the singleton Upstash Redis client if configured, otherwise null.
 */
export function getRedisClient(): Redis | null {
  if (redisInitialized) return redisInstance;

  if (!isRedisConfigured()) {
    redisInitialized = true;
    redisInstance = null;
    return null;
  }

  try {
    redisInstance = Redis.fromEnv();
    redisInitialized = true;
    return redisInstance;
  } catch (error) {
    console.warn("Failed to initialize Upstash Redis from environment:", error);
    redisInitialized = true;
    redisInstance = null;
    return null;
  }
}

/**
 * Safe get with automatic JSON parsing and graceful failure.
 */
export async function redisGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const data = await client.get<T>(key);
    return data ?? null;
  } catch (error) {
    console.warn(`[Redis] get failed for key: ${key}`, error);
    return null;
  }
}

/**
 * Safe set with optional TTL in seconds (ex) and graceful failure.
 */
export async function redisSet(
  key: string,
  value: unknown,
  options?: { ex?: number },
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    if (options?.ex) {
      await client.set(key, value, { ex: options.ex });
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (error) {
    console.warn(`[Redis] set failed for key: ${key}`, error);
    return false;
  }
}

/**
 * Safe delete with graceful failure.
 */
export async function redisDel(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.warn(`[Redis] del failed for key: ${key}`, error);
    return false;
  }
}
