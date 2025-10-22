import "server-only";

import { TRPCError } from "@trpc/server";
import { Ratelimit } from "@upstash/ratelimit";
import { waitUntil } from "@vercel/functions";
import { redis } from "@/lib/redis";
import { t } from "@/trpc/init";

export const SERVICE_LIMITS = {
  dns: { points: 60, window: "1 m" },
  headers: { points: 60, window: "1 m" },
  certs: { points: 30, window: "1 m" },
  registration: { points: 4, window: "1 m" },
  screenshot: { points: 3, window: "1 m" },
  favicon: { points: 120, window: "1 h" },
  seo: { points: 30, window: "1 m" },
  hosting: { points: 30, window: "1 m" },
  pricing: { points: 30, window: "1 m" },
} as const;

export type ServiceName = keyof typeof SERVICE_LIMITS;

const limiters = Object.fromEntries(
  Object.entries(SERVICE_LIMITS).map(([service, cfg]) => [
    service,
    new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        cfg.points,
        cfg.window as `${number} ${"s" | "m" | "h"}`,
      ),
      prefix: `@upstash/ratelimit:${service}`,
      analytics: true,
    }),
  ]),
) as Record<ServiceName, Ratelimit>;

export async function assertRateLimit(service: ServiceName, ip: string) {
  const res = await limiters[service].limit(ip);

  if (!res.success) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((res.reset - Date.now()) / 1000),
    );

    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded for ${service}. Try again in ${retryAfterSec}s.`,
      cause: {
        retryAfter: retryAfterSec,
        service,
        limit: res.limit,
        remaining: res.remaining,
        reset: res.reset,
      },
    });
  }

  // allow ratelimit analytics to be sent in background
  waitUntil(res.pending);

  return { limit: res.limit, remaining: res.remaining, reset: res.reset };
}

export const rateLimitMiddleware = t.middleware(async ({ ctx, next, meta }) => {
  const service = (meta?.service ?? "") as ServiceName;
  if (!service || !(service in SERVICE_LIMITS) || !ctx.ip) return next();
  await assertRateLimit(service, ctx.ip);
  return next();
});
