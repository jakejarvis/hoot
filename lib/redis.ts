import { Redis } from "@upstash/redis";

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

export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  if (!redis) return await loader();
  try {
    const cached = await cacheGet<T>(key);
    if (cached !== null) return cached;
  } catch {
    // ignore cache errors
  }
  const value = await loader();
  try {
    await cacheSet<T>(key, value, ttlSeconds);
  } catch {
    // ignore cache errors
  }
  return value;
}

export { redis };
