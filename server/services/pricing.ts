import { getDomainTld } from "rdapper";
import { acquireLockOrWaitForResult } from "@/lib/cache";
import { logger } from "@/lib/logger";
import { ns, redis } from "@/lib/redis";
import type { Pricing } from "@/lib/schemas";

const log = logger();

type DomainPricingResponse = {
  status: string;
  pricing?: Record<
    string,
    { registration?: string; renewal?: string; transfer?: string }
  >;
};

/**
 * Fetch Porkbun pricing once and cache the full response for 7 days.
 * Individual TLD lookups read from the cached payload.
 */
export async function getPricingForTld(domain: string): Promise<Pricing> {
  const input = (domain ?? "").trim().toLowerCase();
  // Ignore single-label hosts like "localhost" or invalid inputs
  if (!input.includes(".")) return { tld: null, price: null };
  const tld = getDomainTld(input)?.toLowerCase() ?? "";
  if (!tld) return { tld: null, price: null };

  const resultKey = ns("pricing");
  const lockKey = ns("pricing-lock");

  let payload = await redis.get<DomainPricingResponse>(resultKey);
  if (!payload) {
    const lock = await acquireLockOrWaitForResult<DomainPricingResponse>({
      lockKey,
      resultKey,
      lockTtl: 30,
      pollIntervalMs: 250,
      maxWaitMs: 20_000,
    });

    if (lock.acquired) {
      try {
        const res = await fetch(
          // Does not require authentication!
          // https://porkbun.com/api/json/v3/documentation#Domain%20Pricing
          "https://api.porkbun.com/api/json/v3/pricing/get",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          },
        );

        if (res.ok) {
          payload = (await res.json()) as DomainPricingResponse;
          await redis.set(resultKey, payload, { ex: 7 * 24 * 60 * 60 });
          log.info("pricing.fetch.ok", { cached: false });
        } else {
          log.error("pricing.upstream.error", { status: res.status });
        }
      } catch (err) {
        log.error("pricing.fetch.error", { err });
      }
    } else {
      payload = lock.cachedResult;
    }
  }

  const price = payload?.pricing?.[tld]?.registration ?? null;
  return { tld, price };
}
