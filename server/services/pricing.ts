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
        // Write a short-TTL negative cache to prevent hammering during outages
        try {
          await redis.set(provider.cacheKey, null, { ex: 5 });
        } catch (cacheErr) {
          log.warn("negative-cache.failed", {
            provider: provider.name,
            err: cacheErr,
          });
        }
      } finally {
        // Always release the lock so waiters don't stall
        try {
          await redis.del(provider.lockKey);
        } catch (delErr) {
          log.warn("lock.release.failed", {
            provider: provider.name,
            err: delErr,
          });
        }
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10 second timeout

    try {
      const res = await fetch(
        "https://api.porkbun.com/api/json/v3/pricing/get",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          signal: controller.signal,
        },
      );

      if (!res.ok) {
        log.error("upstream.error", {
          provider: "porkbun",
          status: res.status,
        });
        throw new Error(`Porkbun API returned ${res.status}`);
      }

      return (await res.json()) as RegistrarPricingResponse;
    } catch (err) {
      // Translate AbortError into a retryable timeout error
      if (err instanceof Error && err.name === "AbortError") {
        log.error("upstream.timeout", {
          provider: "porkbun",
          timeoutMs: 10_000,
        });
        throw new Error("Porkbun API request timed out after 10 seconds");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
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
 * Runs all provider refreshes in parallel for efficiency.
 */
export async function refreshAllProviderPricing(): Promise<{
  refreshed: string[];
  failed: string[];
}> {
  const refreshed: string[] = [];
  const failed: string[] = [];

  // Run all provider refreshes in parallel
  const tasks = providers.map(async (provider) => {
    try {
      const payload = await provider.fetchPricing();
      await redis.set(provider.cacheKey, payload, {
        ex: provider.cacheTtlSeconds,
      });
      return { name: provider.name, success: true as const };
    } catch (err) {
      return { name: provider.name, success: false as const, error: err };
    }
  });

  const results = await Promise.allSettled(tasks);

  // Process results and emit logs
  for (const result of results) {
    if (result.status === "fulfilled") {
      const { name, success, error } = result.value;
      if (success) {
        refreshed.push(name);
        log.info("refresh.ok", { provider: name });
      } else {
        failed.push(name);
        log.error("refresh.failed", { provider: name, err: error });
      }
    } else {
      // Promise itself was rejected (shouldn't happen with our error handling)
      log.error("refresh.unexpected", { err: result.reason });
    }
  }

  return { refreshed, failed };
}
