import { ns, redis } from "@/lib/redis";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAtMs: number;
};

/**
 * Increments a counter and enforces a simple fixed-window limit.
 * Returns whether the action is allowed, remaining tokens, and reset time.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const k = ns("rl", key);
  let count = 0;
  try {
    count = (await redis.incr(k)) as number;
    if (count === 1) {
      await redis.expire(k, windowSeconds);
    }
  } catch {
    // Fail-open on Redis issues
    return {
      allowed: true,
      remaining: limit,
      resetAtMs: Date.now() + windowSeconds * 1000,
    };
  }
  const allowed = count <= limit;
  const ttl = (await redis.ttl(k)) as number; // seconds
  const resetAtMs = Date.now() + Math.max(0, ttl) * 1000;
  return { allowed, remaining: Math.max(0, limit - count), resetAtMs };
}
