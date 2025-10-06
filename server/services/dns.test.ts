/* @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAll } from "./dns";

vi.mock("@/lib/cloudflare", () => ({
  isCloudflareIpAsync: vi.fn(async () => false),
}));

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
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockRejectedValue(new Error("fail"));
    await expect(resolveAll("example.com")).rejects.toThrow();
    fetchMock.mockRestore();
  });

  it("retries next provider when first fails and succeeds on second", async () => {
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
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(6);
    fetchMock.mockRestore();
  });

  it("caches results across providers and preserves resolver metadata", async () => {
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

    // Second run: should be cache hit and not call fetch at all
    const secondFetch = vi.spyOn(global, "fetch").mockImplementation(() => {
      throw new Error("should not fetch on cache hit");
    });
    const second = await resolveAll("example.com");
    expect(second.records.length).toBe(first.records.length);
    // Resolver should be preserved (whatever was used first)
    expect(["cloudflare", "google"]).toContain(second.resolver);
    secondFetch.mockRestore();
  });
});
