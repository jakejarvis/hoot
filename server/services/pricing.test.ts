/* @vitest-environment node */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

let getPricingForTld: typeof import("./pricing").getPricingForTld;
let refreshAllProviderPricing: typeof import("./pricing").refreshAllProviderPricing;

// Mock registrar pricing response
const mockPorkbunResponse = {
  status: "SUCCESS",
  pricing: {
    com: { registration: "9.99", renewal: "10.99" },
    dev: { registration: "12.00", renewal: "12.00" },
    org: { registration: "11.50" },
  },
};

describe("pricing service", () => {
  beforeAll(async () => {
    const { makeInMemoryRedis } = await import("@/lib/redis-mock");
    const impl = makeInMemoryRedis();
    vi.doMock("@/lib/redis", () => impl);
    const module = await import("./pricing");
    getPricingForTld = module.getPricingForTld;
    refreshAllProviderPricing = module.refreshAllProviderPricing;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();
  });

  describe("getPricingForTld", () => {
    it("returns null price for single-label hosts", async () => {
      const res = await getPricingForTld("localhost");
      expect(res.tld).toBeNull();
      expect(res.price).toBeNull();
    });

    it("returns null price for empty input", async () => {
      const res = await getPricingForTld("");
      expect(res.tld).toBeNull();
      expect(res.price).toBeNull();
    });

    it("fetches from porkbun provider and caches response on miss", async () => {
      // Mock Porkbun API
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockPorkbunResponse,
      } as unknown as Response);

      const res = await getPricingForTld("example.com");

      expect(res.tld).toBe("com");
      expect(res.price).toBe("9.99");

      // Verify cache was set
      const { redis } = await import("@/lib/redis");
      expect(await redis.exists("pricing:porkbun")).toBe(1);
    });

    it("uses cached provider data without fetching again", async () => {
      // Seed cache with porkbun data
      const { redis } = await import("@/lib/redis");
      await redis.set("pricing:porkbun", mockPorkbunResponse);

      const fetchSpy = vi.spyOn(global, "fetch");
      const res = await getPricingForTld("something.dev");

      expect(res.tld).toBe("dev");
      expect(res.price).toBe("12.00");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("handles upstream API error gracefully", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as unknown as Response);

      const res = await getPricingForTld("example.com");
      expect(res.tld).toBe("com");
      expect(res.price).toBeNull();
    });

    it("handles network fetch error gracefully", async () => {
      vi.spyOn(global, "fetch").mockRejectedValueOnce(
        new Error("Network timeout"),
      );

      const res = await getPricingForTld("example.org");
      expect(res.tld).toBe("org");
      expect(res.price).toBeNull();
    });

    it("returns null when TLD is not found in provider response", async () => {
      // Seed cache with data that doesn't include .xyz
      const { redis } = await import("@/lib/redis");
      await redis.set("pricing:porkbun", mockPorkbunResponse);

      const res = await getPricingForTld("example.xyz");
      expect(res.tld).toBe("xyz");
      expect(res.price).toBeNull();
    });

    it("normalizes domain input (case, whitespace)", async () => {
      const { redis } = await import("@/lib/redis");
      await redis.set("pricing:porkbun", mockPorkbunResponse);

      const res = await getPricingForTld("  EXAMPLE.COM  ");
      expect(res.tld).toBe("com");
      expect(res.price).toBe("9.99");
    });

    it("handles subdomains correctly by extracting TLD", async () => {
      const { redis } = await import("@/lib/redis");
      await redis.set("pricing:porkbun", mockPorkbunResponse);

      const res = await getPricingForTld("www.example.dev");
      expect(res.tld).toBe("dev");
      expect(res.price).toBe("12.00");
    });
  });

  describe("refreshAllProviderPricing", () => {
    it("successfully refreshes all providers and populates cache", async () => {
      // Mock Porkbun API
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockPorkbunResponse,
      } as unknown as Response);

      const result = await refreshAllProviderPricing();

      expect(result.refreshed).toEqual(["porkbun"]);
      expect(result.failed).toEqual([]);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Verify cache was populated
      const { redis } = await import("@/lib/redis");
      const cached = await redis.get("pricing:porkbun");
      expect(cached).toEqual(mockPorkbunResponse);
    });

    it("handles API errors and reports failed providers", async () => {
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 503,
      } as unknown as Response);

      const result = await refreshAllProviderPricing();

      expect(result.refreshed).toEqual([]);
      expect(result.failed).toEqual(["porkbun"]);

      // Verify cache was not populated
      const { redis } = await import("@/lib/redis");
      expect(await redis.exists("pricing:porkbun")).toBe(0);
    });

    it("handles network errors and reports failed providers", async () => {
      vi.spyOn(global, "fetch").mockRejectedValueOnce(
        new Error("ECONNREFUSED"),
      );

      const result = await refreshAllProviderPricing();

      expect(result.refreshed).toEqual([]);
      expect(result.failed).toEqual(["porkbun"]);
    });

    it("refreshes even when cache already exists", async () => {
      // Pre-populate cache with old data
      const { redis } = await import("@/lib/redis");
      const oldData = {
        status: "SUCCESS",
        pricing: { com: { registration: "8.88" } },
      };
      await redis.set("pricing:porkbun", oldData);

      // Mock API with new data
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockPorkbunResponse,
      } as unknown as Response);

      const result = await refreshAllProviderPricing();

      expect(result.refreshed).toEqual(["porkbun"]);
      expect(result.failed).toEqual([]);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Verify cache was updated with new data
      const cached = await redis.get("pricing:porkbun");
      expect(cached).toEqual(mockPorkbunResponse);
      expect(cached).not.toEqual(oldData);
    });
  });
});
