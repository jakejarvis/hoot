import Redis from "ioredis";
import type { ZodType } from "zod";

let client: Redis | null = null;
let connecting: Promise<unknown> | null = null;

async function ensureClient(): Promise<Redis | null> {
  const url = process.env.REDIS_URL;
  if (!url) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Missing REDIS_URL environment variable.");
    }
    return null;
  }

  if (client) return client;

  if (!client) {
    client = new Redis(url);
    client.on("error", () => {
      // swallow errors; callers already fail soft
    });
  }

  if (!connecting) {
    connecting =
      client.status === "ready" ? Promise.resolve() : client.connect();
  }
  try {
    await connecting;
  } catch {
    client = null;
  } finally {
    connecting = null;
  }

  return client?.status === "ready" ? client : null;
}

export function ns(namespace: string, id: string): string {
  return `${namespace}:${id}`;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await ensureClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Non-JSON payloads are not expected; treat as miss
      return null;
    }
  } catch {
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  const redis = await ensureClient();
  if (!redis) return;
  try {
    const payload = JSON.stringify(value);
    await redis.set(key, payload, "EX", ttlSeconds);
  } catch {
    // no-op
  }
}

export async function cacheDel(key: string): Promise<void> {
  const redis = await ensureClient();
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
  const redis = await ensureClient();
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
