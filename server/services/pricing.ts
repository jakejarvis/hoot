import { getDomainTld } from "rdapper";
import { acquireLockOrWaitForResult } from "@/lib/cache";
import { logger } from "@/lib/logger";
import { ns, redis } from "@/lib/redis";
import type { Pricing } from "@/lib/schemas";

const log = logger({ module: "pricing" });

/**
 * Normalized pricing response shape that all registrars conform to.
 */
type RegistrarPricingResponse = {
  status: string;
  pricing?: Record<
    string,
    { registration?: string; renewal?: string; transfer?: string }
  >;
};

/**
 * Generic pricing provider interface that each registrar implements.
 */
interface PricingProvider {
  /** Provider name for logging */
  name: string;
  /** Redis key for cached pricing data */
  cacheKey: string;
  /** Redis key for distributed lock */
  lockKey: string;
  /** How long to cache the pricing data (seconds) */
  cacheTtlSeconds: number;
  /** Fetch pricing data from the registrar API */
  fetchPricing: () => Promise<RegistrarPricingResponse>;
  /** Extract the registration price for a specific TLD from the response */
  extractPrice: (
    response: RegistrarPricingResponse,
    tld: string,
  ) => string | null;
}

/**
 * Generic function to fetch and cache pricing data from any provider.
 */
async function fetchProviderPricing(
  provider: PricingProvider,
): Promise<RegistrarPricingResponse | null> {
  let payload = await redis.get<RegistrarPricingResponse>(provider.cacheKey);

  if (!payload) {
    const lock = await acquireLockOrWaitForResult<RegistrarPricingResponse>({
      lockKey: provider.lockKey,
      resultKey: provider.cacheKey,
      lockTtl: 30,
      pollIntervalMs: 250,
      maxWaitMs: 20_000,
    });

    if (lock.acquired) {
      try {
        payload = await provider.fetchPricing();
        await redis.set(provider.cacheKey, payload, {
          ex: provider.cacheTtlSeconds,
        });
        log.info("fetch.ok", { provider: provider.name, cached: false });
      } catch (err) {
        log.error("fetch.error", { provider: provider.name, err });
      }
    } else {
      payload = lock.cachedResult;
    }
  }

  return payload ?? null;
}

// ============================================================================
// Provider Implementations
// ============================================================================

const porkbunProvider: PricingProvider = {
  name: "porkbun",
  cacheKey: ns("pricing:porkbun"),
  lockKey: ns("pricing:porkbun-lock"),
  cacheTtlSeconds: 7 * 24 * 60 * 60, // 7 days

  async fetchPricing(): Promise<RegistrarPricingResponse> {
    // Does not require authentication!
    // https://porkbun.com/api/json/v3/documentation#Domain%20Pricing
    const res = await fetch("https://api.porkbun.com/api/json/v3/pricing/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    if (!res.ok) {
      log.error("upstream.error", {
        provider: "porkbun",
        status: res.status,
      });
      throw new Error(`Porkbun API returned ${res.status}`);
    }

    return (await res.json()) as RegistrarPricingResponse;
  },

  extractPrice(response: RegistrarPricingResponse, tld: string): string | null {
    return response?.pricing?.[tld]?.registration ?? null;
  },
};

// Add more providers here, e.g., cloudflareProvider, godaddyProvider, etc.
// const cloudflareProvider: PricingProvider = { ... };

/**
 * List of providers to check in order of preference.
 * First provider with valid pricing wins.
 */
const providers: PricingProvider[] = [porkbunProvider];

// ============================================================================
// Public API
// ============================================================================

/**
 * Fetch domain pricing for the given domain's TLD.
 * Tries multiple registrar providers in order until one returns a price.
 */
export async function getPricingForTld(domain: string): Promise<Pricing> {
  const input = (domain ?? "").trim().toLowerCase();
  // Ignore single-label hosts like "localhost" or invalid inputs
  if (!input.includes(".")) return { tld: null, price: null };

  const tld = getDomainTld(input)?.toLowerCase() ?? "";
  if (!tld) return { tld: null, price: null };

  // Try each provider in order
  for (const provider of providers) {
    const payload = await fetchProviderPricing(provider);
    if (payload) {
      const price = provider.extractPrice(payload, tld);
      if (price) {
        return { tld, price };
      }
    }
  }

  // No provider returned a price
  return { tld, price: null };
}

/**
 * Proactively refresh pricing data from all providers.
 * Called by the daily cron job to keep cache warm.
 */
export async function refreshAllProviderPricing(): Promise<{
  refreshed: string[];
  failed: string[];
}> {
  const refreshed: string[] = [];
  const failed: string[] = [];

  for (const provider of providers) {
    try {
      const payload = await provider.fetchPricing();
      await redis.set(provider.cacheKey, payload, {
        ex: provider.cacheTtlSeconds,
      });
      refreshed.push(provider.name);
      log.info("refresh.ok", { provider: provider.name });
    } catch (err) {
      log.error("refresh.failed", { provider: provider.name, err });
      failed.push(provider.name);
    }
  }

  return { refreshed, failed };
}
