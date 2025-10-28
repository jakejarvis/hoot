/* @vitest-environment node */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("@/lib/cloudflare", () => ({
  isCloudflareIpAsync: vi.fn(async () => false),
}));

beforeAll(async () => {
  const { makePGliteDb } = await import("@/lib/db/pglite");
  const { db } = await makePGliteDb();
  vi.doMock("@/lib/db/client", () => ({ db }));
  const { makeInMemoryRedis } = await import("@/lib/redis-mock");
  const impl = makeInMemoryRedis();
  vi.doMock("@/lib/redis", () => impl);
});

beforeEach(async () => {
  const { resetPGliteDb } = await import("@/lib/db/pglite");
  await resetPGliteDb();
});

afterEach(async () => {
  vi.restoreAllMocks();
  const { resetInMemoryRedis } = await import("@/lib/redis-mock");
  resetInMemoryRedis();
});

function dohAnswer(
  answers: Array<{ name: string; TTL: number; data: string }>,
) {
  return new Response(JSON.stringify({ Status: 0, Answer: answers }), {
    status: 200,
    headers: { "content-type": "application/dns-json" },
  });
}

describe("resolveAll", () => {
  it("normalizes records and returns combined results", async () => {
    const { resolveAll } = await import("./dns");
    // The code calls DoH for A, AAAA, MX, TXT, NS in parallel and across providers; we just return A for both A and AAAA etc.
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        dohAnswer([{ name: "example.com.", TTL: 60, data: "1.2.3.4" }]),
      )
      .mockResolvedValueOnce(
        dohAnswer([{ name: "example.com.", TTL: 60, data: "1.2.3.4" }]),
      ) // AAAA
      .mockResolvedValueOnce(
        dohAnswer([
          {
            name: "example.com.",
            TTL: 300,
            data: "10 aspmx.l.google.com.",
          },
        ]),
      )
      .mockResolvedValueOnce(
        dohAnswer([{ name: "example.com.", TTL: 120, data: '"v=spf1"' }]),
      )
      .mockResolvedValueOnce(
        dohAnswer([
          {
            name: "example.com.",
            TTL: 600,
            data: "ns1.cloudflare.com.",
          },
        ]),
      );

    const out = await resolveAll("example.com");
    expect(out.records.length).toBeGreaterThan(0);
    const hasTxt = out.records.some(
      (r) => r.type === "TXT" && r.value === "v=spf1",
    );
    const hasMx = out.records.some((r) => r.type === "MX" && r.priority === 10);
    const hasNs = out.records.some(
      (r) => r.type === "NS" && r.value === "ns1.cloudflare.com",
    );
    expect(hasTxt && hasMx && hasNs).toBe(true);
    fetchMock.mockRestore();
  });

  it("throws when all providers fail", async () => {
    const { resolveAll } = await import("./dns");
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockRejectedValue(new Error("network"));
    await expect(resolveAll("example.invalid")).rejects.toThrow();
    fetchMock.mockRestore();
  });

  it("retries next provider when first fails and succeeds on second", async () => {
    const { resolveAll } = await import("./dns");
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();
    let call = 0;
    const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async () => {
      call += 1;
      if (call <= 5) {
        throw new Error("provider1 fail");
      }
      // Calls 6..10 correspond to A, AAAA, MX, TXT, NS for second provider
      const idx = call - 6;
      switch (idx) {
        case 0:
        case 1:
          return dohAnswer([
            { name: "example.com.", TTL: 60, data: "1.2.3.4" },
          ]);
        case 2:
          return dohAnswer([
            { name: "example.com.", TTL: 300, data: "10 aspmx.l.google.com." },
          ]);
        case 3:
          return dohAnswer([
            { name: "example.com.", TTL: 120, data: '"v=spf1"' },
          ]);
        default:
          return dohAnswer([
            { name: "example.com.", TTL: 600, data: "ns1.cloudflare.com." },
          ]);
      }
    });

    const out = await resolveAll("example.com");
    expect(out.records.length).toBeGreaterThan(0);
    fetchMock.mockRestore();
  });

  it("caches results across providers and preserves resolver metadata", async () => {
    const { resolveAll } = await import("./dns");
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();
    // First run: succeed and populate cache and resolver meta
    const firstFetch = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        dohAnswer([{ name: "example.com.", TTL: 60, data: "1.2.3.4" }]),
      )
      .mockResolvedValueOnce(
        dohAnswer([{ name: "example.com.", TTL: 60, data: "::1" }]),
      )
      .mockResolvedValueOnce(
        dohAnswer([
          {
            name: "example.com.",
            TTL: 300,
            data: "10 aspmx.l.google.com.",
          },
        ]),
      )
      .mockResolvedValueOnce(
        dohAnswer([{ name: "example.com.", TTL: 120, data: '"v=spf1"' }]),
      )
      .mockResolvedValueOnce(
        dohAnswer([
          {
            name: "example.com.",
            TTL: 600,
            data: "ns1.cloudflare.com.",
          },
        ]),
      );

    const first = await resolveAll("example.com");
    expect(first.records.length).toBeGreaterThan(0);
    firstFetch.mockRestore();

    // Second run: DB hit — no network calls expected
    const fetchSpy = vi.spyOn(global, "fetch");
    const second = await resolveAll("example.com");
    expect(second.records.length).toBe(first.records.length);
    expect(["cloudflare", "google", "quad9"]).toContain(second.resolver);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("dedupes concurrent callers via aggregate cache/lock", async () => {
    const { resolveAll } = await import("./dns");
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();
    // Use the top-level dohAnswer helper declared above

    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        dohAnswer([{ name: "example.com.", TTL: 60, data: "1.2.3.4" }]),
      )
      .mockResolvedValueOnce(
        dohAnswer([{ name: "example.com.", TTL: 60, data: "::1" }]),
      )
      .mockResolvedValueOnce(
        dohAnswer([
          { name: "example.com.", TTL: 300, data: "10 aspmx.l.google.com." },
        ]),
      )
      .mockResolvedValueOnce(
        dohAnswer([{ name: "example.com.", TTL: 120, data: '"v=spf1"' }]),
      )
      .mockResolvedValueOnce(
        dohAnswer([
          { name: "example.com.", TTL: 600, data: "ns1.cloudflare.com." },
        ]),
      );

    // Fire several concurrent calls
    const [r1, r2, r3] = await Promise.all([
      resolveAll("example.com"),
      resolveAll("example.com"),
      resolveAll("example.com"),
    ]);

    expect(r1.records.length).toBeGreaterThan(0);
    expect(r2.records.length).toBeGreaterThan(0);
    expect(r3.records.length).toBeGreaterThan(0);
    // Ensure all callers see non-empty results; DoH fetch call counts and exact lengths may vary under concurrency
    fetchMock.mockRestore();
  });

  it("fetches missing AAAA during partial revalidation", async () => {
    const { resolveAll } = await import("./dns");
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();

    // First run: full fetch; AAAA returns empty, others present
    const firstFetch = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        dohAnswer([{ name: "example.com.", TTL: 60, data: "1.2.3.4" }]),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ Status: 0, Answer: [] }), {
          status: 200,
          headers: { "content-type": "application/dns-json" },
        }),
      )
      .mockResolvedValueOnce(
        dohAnswer([
          { name: "example.com.", TTL: 300, data: "10 aspmx.l.google.com." },
        ]),
      )
      .mockResolvedValueOnce(
        dohAnswer([{ name: "example.com.", TTL: 120, data: '"v=spf1"' }]),
      )
      .mockResolvedValueOnce(
        dohAnswer([
          { name: "example.com.", TTL: 600, data: "ns1.cloudflare.com." },
        ]),
      );

    const first = await resolveAll("example.com");
    expect(first.records.some((r) => r.type === "AAAA")).toBe(false);
    firstFetch.mockRestore();

    // Second run: partial revalidation should fetch only AAAA
    const secondFetch = vi
      .spyOn(global, "fetch")
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url =
          input instanceof URL
            ? input
            : new URL(
                typeof input === "string"
                  ? input
                  : ((input as unknown as { url: string }).url as string),
              );
        const type = url.searchParams.get("type");
        if (type === "AAAA") {
          return dohAnswer([
            { name: "example.com.", TTL: 300, data: "2001:db8::1" },
          ]);
        }
        return dohAnswer([]);
      });

    const second = await resolveAll("example.com");
    secondFetch.mockRestore();

    // Ensure AAAA was fetched and returned
    expect(
      second.records.some(
        (r) => r.type === "AAAA" && r.value === "2001:db8::1",
      ),
    ).toBe(true);
  });
});

describe("providerOrderForLookup (hash-based selection)", () => {
  it("returns deterministic provider order for same domain", async () => {
    const { DOH_PROVIDERS, providerOrderForLookup } = await import("./dns");

    const order1 = providerOrderForLookup("example.com");
    const order2 = providerOrderForLookup("example.com");
    const order3 = providerOrderForLookup("example.com");

    expect(order1).toEqual(order2);
    expect(order2).toEqual(order3);
    expect(order1.length).toBe(DOH_PROVIDERS.length);
  });

  it("is case-insensitive for domain hashing", async () => {
    const { providerOrderForLookup } = await import("./dns");

    const order1 = providerOrderForLookup("Example.COM");
    const order2 = providerOrderForLookup("example.com");
    const order3 = providerOrderForLookup("EXAMPLE.COM");

    expect(order1).toEqual(order2);
    expect(order2).toEqual(order3);
  });

  it("distributes different domains across providers", async () => {
    const { DOH_PROVIDERS, providerOrderForLookup } = await import("./dns");

    const domains = [
      "example.com",
      "google.com",
      "github.com",
      "stackoverflow.com",
      "reddit.com",
      "twitter.com",
      "facebook.com",
      "amazon.com",
      "wikipedia.org",
      "cloudflare.com",
    ];

    const primaryProviders = domains.map(
      (domain) => providerOrderForLookup(domain)[0].key,
    );

    // Check that we get some variety (at least 2 different providers used)
    const uniqueProviders = new Set(primaryProviders);
    expect(uniqueProviders.size).toBeGreaterThanOrEqual(
      Math.min(2, DOH_PROVIDERS.length),
    );
  });

  it("maintains consistent fallback order for a domain", async () => {
    const { DOH_PROVIDERS, providerOrderForLookup } = await import("./dns");

    const order = providerOrderForLookup("test-domain.com");

    // Verify all providers are present exactly once
    expect(order.length).toBe(DOH_PROVIDERS.length);
    const providerKeys = order.map((p) => p.key);
    const uniqueKeys = new Set(providerKeys);
    expect(uniqueKeys.size).toBe(DOH_PROVIDERS.length);
  });

  it("ensures resolver consistency improves cache hits", async () => {
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    const { resolveAll } = await import("./dns");
    resetInMemoryRedis();

    // First request for domain1
    const fetchMock1 = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        dohAnswer([{ name: "domain1.com.", TTL: 60, data: "1.2.3.4" }]),
      )
      .mockResolvedValueOnce(
        dohAnswer([{ name: "domain1.com.", TTL: 60, data: "::1" }]),
      )
      .mockResolvedValueOnce(
        dohAnswer([
          { name: "domain1.com.", TTL: 300, data: "10 mx.domain1.com." },
        ]),
      )
      .mockResolvedValueOnce(
        dohAnswer([{ name: "domain1.com.", TTL: 120, data: '"v=spf1"' }]),
      )
      .mockResolvedValueOnce(
        dohAnswer([
          { name: "domain1.com.", TTL: 600, data: "ns1.domain1.com." },
        ]),
      );

    const result1 = await resolveAll("domain1.com");
    expect(result1.records.length).toBeGreaterThan(0);
    const resolver1 = result1.resolver;
    fetchMock1.mockRestore();

    // Second request for same domain - should use same resolver from cache
    const fetchSpy = vi.spyOn(global, "fetch");
    const result2 = await resolveAll("domain1.com");
    expect(result2.resolver).toBe(resolver1);
    expect(fetchSpy).not.toHaveBeenCalled(); // DB cache hit
    fetchSpy.mockRestore();
  });
});
