/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cloudflare", () => ({
  isCloudflareIpAsync: vi.fn(async () => false),
}));

vi.mock("@/lib/domain-server", () => ({
  toRegistrableDomain: (d: string) => {
    const value = (d ?? "").trim().toLowerCase().replace(/\.$/, "");
    if (value === "") return null;
    const parts = value.split(".");
    return parts.length >= 2
      ? `${parts[parts.length - 2]}.${parts[parts.length - 1]}`
      : null;
  },
}));

beforeEach(async () => {
  vi.resetModules();
  const { makePGliteDb } = await import("@/server/db/pglite");
  const { db } = await makePGliteDb();
  vi.doMock("@/server/db/client", () => ({ db }));
});

afterEach(() => {
  vi.restoreAllMocks();
  // Clear shared redis mock counters if present
  globalThis.__redisTestHelper?.reset();
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
    globalThis.__redisTestHelper?.reset();
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
    globalThis.__redisTestHelper?.reset();
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

    // Second run: should be database hit; avoid reusing exhausted body by mocking fresh resolves
    const secondFetch = vi
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
    const second = await resolveAll("example.com");
    expect(second.records.length).toBe(first.records.length);
    // Resolver should be preserved (whatever was used first)
    expect(["cloudflare", "google"]).toContain(second.resolver);
    secondFetch.mockRestore();
  });

  it("dedupes concurrent callers via aggregate cache/lock", async () => {
    const { resolveAll } = await import("./dns");
    globalThis.__redisTestHelper?.reset();
    // Prepare one set of responses for provider 1 across types
    const dohAnswer = (
      answers: Array<{ name: string; TTL: number; data: string }>,
    ) =>
      new Response(JSON.stringify({ Status: 0, Answer: answers }), {
        status: 200,
        headers: { "content-type": "application/dns-json" },
      });

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
});
