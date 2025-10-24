import { logger } from "@/lib/logger";
import { ns, redis } from "@/lib/redis";

const log = logger({ module: "cache" });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type LockResult<T = unknown> =
  | { acquired: true; cachedResult: null }
  | { acquired: false; cachedResult: T | null };

/**
 * Acquire a Redis lock or wait for result from another process
 *
 * This prevents duplicate work by:
 * 1. Trying to acquire lock with NX (only set if not exists)
 * 2. If lock acquired, caller does work and caches result
 * 3. If lock NOT acquired, poll for cached result until timeout
 *
 * @param options.lockKey - Redis key for the lock
 * @param options.resultKey - Redis key where result will be cached
 * @param options.lockTtl - Lock TTL in seconds (default 30)
 * @param options.pollIntervalMs - How often to check for result (default 250ms)
 * @param options.maxWaitMs - Max time to wait for result (default 25000ms)
 * @returns Lock status and any cached result
 */
export async function acquireLockOrWaitForResult<T = unknown>(options: {
  lockKey: string;
  resultKey: string;
  lockTtl?: number;
  pollIntervalMs?: number;
  maxWaitMs?: number;
}): Promise<LockResult<T>> {
  const {
    lockKey,
    resultKey,
    lockTtl = 30,
    pollIntervalMs = 250,
    maxWaitMs = 25000,
  } = options;

  // Try to acquire lock
  try {
    const setRes = await redis.set(lockKey, "1", {
      nx: true,
      ex: lockTtl,
    });
    const acquired = setRes === "OK" || setRes === undefined;

    if (acquired) {
      log.debug("redis.lock.acquired", { lockKey });
      return { acquired: true, cachedResult: null };
    }

    log.debug("redis.lock.not.acquired", {
      lockKey,
      resultKey,
      maxWaitMs,
    });
  } catch (err) {
    log.warn("redis.lock.acquisition.failed", {
      lockKey,
      err,
    });
    // If Redis is down, fail open (don't wait)
    return { acquired: true, cachedResult: null };
  }

  // Lock not acquired, poll for result
  const startTime = Date.now();
  let pollCount = 0;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      pollCount++;
      const result = (await redis.get(resultKey)) as T | null;

      if (result !== null) {
        log.debug("redis.cache.hit.waiting", {
          lockKey,
          resultKey,
          pollCount,
          waitMs: Date.now() - startTime,
        });
        return { acquired: false, cachedResult: result };
      }

      // Check if lock still exists - if not, the other process may have failed
      const lockExists = await redis.exists(lockKey);
      if (!lockExists) {
        log.warn("redis.lock.disappeared", {
          lockKey,
          resultKey,
          pollCount,
        });
        // Lock gone but no result - other process likely failed
        // Try to acquire lock ourselves
        const retryRes = await redis.set(lockKey, "1", {
          nx: true,
          ex: lockTtl,
        });
        const retryAcquired = retryRes === "OK" || retryRes === undefined;
        if (retryAcquired) {
          return { acquired: true, cachedResult: null };
        }
      }
    } catch (err) {
      log.warn("redis.polling.error", {
        lockKey,
        resultKey,
        err,
      });
    }

    await sleep(pollIntervalMs);
  }

  log.warn("redis.wait.timeout", {
    lockKey,
    resultKey,
    pollCount,
    waitMs: Date.now() - startTime,
  });

  return { acquired: false, cachedResult: null };
}

type CachedAssetOptions<TProduceMeta extends Record<string, unknown>> = {
  indexKey: string;
  lockKey: string;
  ttlSeconds: number;
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
  const { indexKey, lockKey, ttlSeconds, produceAndUpload, purgeQueue } =
    options;

  // 1) Check index
  try {
    const raw = (await redis.get(indexKey)) as { url?: unknown } | null;
    if (raw && typeof raw === "object") {
      const cachedUrl = (raw as { url?: unknown }).url;
      if (typeof cachedUrl === "string") {
        return { url: cachedUrl };
      }
      if (cachedUrl === null) {
        return { url: null };
      }
    }
  } catch (err) {
    log.debug("redis.index.read.failed", { indexKey, err });
  }

  // 2) Acquire lock or wait
  const lockResult = await acquireLockOrWaitForResult<{ url: string | null }>({
    lockKey,
    resultKey: indexKey,
    lockTtl: Math.max(5, Math.min(120, ttlSeconds)),
  });

  if (!lockResult.acquired) {
    const cached = lockResult.cachedResult;
    if (cached && typeof cached === "object" && "url" in cached) {
      const cachedUrl = (cached as { url: string | null }).url;
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
    } catch (err) {
      log.warn("redis.cache.store.failed", { indexKey, purgeQueue, err });
    }

    return { url: produced.url };
  } finally {
    try {
      await redis.del(lockKey);
    } catch (err) {
      log.debug("redis.lock.release.failed", { lockKey, err });
    }
  }
}
