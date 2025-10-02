import { Redis } from "@upstash/redis";
import type { ZodType } from "zod";

let redis: Redis | null = null;
if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  redis = new Redis({
    url: process.env.KV_REST_API_URL as string,
    token: process.env.KV_REST_API_TOKEN as string,
  });
}

if (!redis && process.env.NODE_ENV === "development") {
  console.warn(
    "Missing KV_REST_API_URL and/or KV_REST_API_TOKEN environment variables.",
  );
}

export function ns(namespace: string, id: string): string {
  return `${namespace}:${id}`;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const value = await redis.get<T>(key);
    return (value as T | null) ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value as unknown as object, { ex: ttlSeconds });
  } catch {
    // no-op
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // no-op
  }
}

export async function cacheGetZod<T>(
  key: string,
  schema: ZodType<T>,
): Promise<T | null> {
  const value = await cacheGet<unknown>(key);
  if (value === null) return null;
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  try {
    await cacheDel(key);
  } catch {}
  return null;
}

// removed legacy validated helpers in favor of Zod-based variants

export async function getOrSetZod<T>(
  key: string,
  ttlSeconds: number | ((value: T) => number),
  loader: () => Promise<T>,
  schema: ZodType<T>,
): Promise<T> {
  if (!redis) return await loader();
  try {
    const value = await cacheGet<unknown>(key);
    if (value !== null) {
      const parsed = schema.safeParse(value);
      if (parsed.success) return parsed.data as T;
      await cacheDel(key);
    }
  } catch {
    // ignore cache errors
  }
  const fresh = await loader();
  try {
    const ttl =
      typeof ttlSeconds === "function" ? ttlSeconds(fresh) : ttlSeconds;
    await cacheSet<T>(key, fresh, ttl);
  } catch {
    // ignore cache errors
  }
  return fresh;
}

export { redis };
