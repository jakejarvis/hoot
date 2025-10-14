import { captureServer } from "@/lib/analytics/server";
import { ns, redis } from "@/lib/redis";

type CachedAssetOptions<TProduceMeta extends Record<string, unknown>> = {
  indexKey: string;
  lockKey: string;
  ttlSeconds: number;
  eventName: string;
  baseMetrics?: Record<string, unknown>;
  /**
   * Produce and upload the asset, returning { url, key } and any metrics to attach
   */
  produceAndUpload: () => Promise<{
    url: string | null;
    key?: string;
    metrics?: TProduceMeta;
  }>;
  /**
   * Purge queue name (zset) for scheduling deletes by expiresAtMs
   * If provided and key is returned, will zadd(key, expiresAtMs)
   */
  purgeQueue?: string;
};

export async function getOrCreateCachedAsset<T extends Record<string, unknown>>(
  options: CachedAssetOptions<T>,
): Promise<{ url: string | null }> {
  const {
    indexKey,
    lockKey,
    ttlSeconds,
    eventName,
    baseMetrics,
    produceAndUpload,
    purgeQueue,
  } = options;
  const startedAt = Date.now();

  // 1) Check index
  try {
    const raw = (await redis.get(indexKey)) as { url?: unknown } | null;
    if (raw && typeof raw === "object") {
      const cachedUrl = (raw as { url?: unknown }).url;
      if (typeof cachedUrl === "string") {
        await captureServer(eventName, {
          ...baseMetrics,
          source: "redis",
          duration_ms: Date.now() - startedAt,
          outcome: "ok",
          cache: "hit",
        });
        return { url: cachedUrl };
      }
      if (cachedUrl === null) {
        await captureServer(eventName, {
          ...baseMetrics,
          source: "redis",
          duration_ms: Date.now() - startedAt,
          outcome: "not_found",
          cache: "hit",
        });
        return { url: null };
      }
    }
  } catch {}

  // 2) Acquire lock or wait
  // Reuse redis.ts helper rather than duplicating. Import here lazily to avoid cycles.
  const { acquireLockOrWaitForResult } = await import("@/lib/redis");
  const lockResult = await acquireLockOrWaitForResult<{ url: string | null }>({
    lockKey,
    resultKey: indexKey,
    lockTtl: Math.max(5, Math.min(120, ttlSeconds)),
  });

  if (!lockResult.acquired) {
    const cached = lockResult.cachedResult;
    if (cached && typeof cached === "object" && "url" in cached) {
      const cachedUrl = (cached as { url: string | null }).url;
      await captureServer(eventName, {
        ...baseMetrics,
        source: "redis_wait",
        duration_ms: Date.now() - startedAt,
        outcome: cachedUrl ? "ok" : "not_found",
        cache: "wait",
      });
      return { url: cachedUrl };
    }
    return { url: null };
  }

  // 3) Do work under lock
  try {
    const produced = await produceAndUpload();
    const expiresAtMs = Date.now() + ttlSeconds * 1000;

    try {
      await redis.set(
        indexKey,
        { url: produced.url, key: produced.key, expiresAtMs },
        { ex: ttlSeconds },
      );
      if (purgeQueue && produced.key) {
        await redis.zadd(ns("purge", purgeQueue), {
          score: expiresAtMs,
          member: produced.key,
        });
      }
    } catch {}

    await captureServer(eventName, {
      ...baseMetrics,
      ...(produced.metrics ?? {}),
      duration_ms: Date.now() - startedAt,
      outcome: produced.url ? "ok" : "not_found",
      cache: "store",
    });
    return { url: produced.url };
  } finally {
    try {
      await redis.del(lockKey);
    } catch {}
  }
}
