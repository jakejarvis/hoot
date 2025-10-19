/* @vitest-environment node */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

let getPricingForTld: typeof import("./pricing").getPricingForTld;

// Mock upstream fetch
const mockResponse = {
  status: "SUCCESS",
  pricing: {
    com: { registration: "9.99" },
    dev: { registration: "12.00" },
  },
};

describe("getPricingForTld", () => {
  beforeAll(async () => {
    const { makeInMemoryRedis } = await import("@/lib/redis-mock");
    const impl = makeInMemoryRedis();
    vi.doMock("@/lib/redis", () => impl);
    ({ getPricingForTld } = await import("./pricing"));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();
  });

  it("returns null price for invalid tld input", async () => {
    const res = await getPricingForTld("localhost");
    // "localhost" -> tld becomes "" (no dot), handled as null
    expect(res.tld).toBeNull();
    expect(res.price).toBeNull();
  });

  it("fetches upstream and caches full payload on miss", async () => {
    // Arrange: mock fetch
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as unknown as Response);

    // Act
    const res = await getPricingForTld("example.com");

    // Assert
    expect(res.tld).toBe("com");
    expect(res.price).toBe("9.99");
    const { redis } = await import("@/lib/redis");
    expect(await redis.exists("pricing")).toBe(1);
  });

  it("uses cached payload on subsequent calls without fetching again", async () => {
    // Seed cache
    const { redis } = await import("@/lib/redis");
    await redis.set("pricing", mockResponse);
    const fetchSpy = vi.spyOn(global, "fetch");

    const res = await getPricingForTld("something.dev");
    expect(res.tld).toBe("dev");
    expect(res.price).toBe("12.00");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("handles upstream error gracefully", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as unknown as Response);
    const res = await getPricingForTld("example.com");
    expect(res.tld).toBe("com");
    expect(res.price).toBeNull();
  });
});
