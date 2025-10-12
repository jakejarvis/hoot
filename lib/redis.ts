import { Redis } from "@upstash/redis";

// Uses KV_REST_API_URL and KV_REST_API_TOKEN set by Vercel integration
export const redis = Redis.fromEnv();

export function ns(n: string, id?: string): string {
  return `${n}${id ? `:${id}` : ""}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type LockResult<T = unknown> =
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
      console.debug("[redis] lock acquired", { lockKey });
      return { acquired: true, cachedResult: null };
    }

    console.debug("[redis] lock not acquired, waiting for result", {
      lockKey,
      resultKey,
      maxWaitMs,
    });
  } catch (err) {
    console.warn("[redis] lock acquisition failed", {
      lockKey,
      error: (err as Error)?.message,
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
        console.debug("[redis] found cached result while waiting", {
          lockKey,
          resultKey,
          pollCount,
          waitedMs: Date.now() - startTime,
        });
        return { acquired: false, cachedResult: result };
      }

      // Check if lock still exists - if not, the other process may have failed
      const lockExists = await redis.exists(lockKey);
      if (!lockExists) {
        console.warn("[redis] lock disappeared without result", {
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
      console.warn("[redis] error polling for result", {
        lockKey,
        resultKey,
        error: (err as Error)?.message,
      });
    }

    await sleep(pollIntervalMs);
  }

  console.warn("[redis] wait timeout, no result found", {
    lockKey,
    resultKey,
    pollCount,
    waitedMs: Date.now() - startTime,
  });

  return { acquired: false, cachedResult: null };
}
