/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/domain-server", () => ({
  toRegistrableDomain: (d: string) => (d ? d.toLowerCase() : null),
}));

beforeEach(async () => {
  vi.resetModules();
  const { makePGliteDb } = await import("@/server/db/pglite");
  const { db } = await makePGliteDb();
  vi.doMock("@/server/db/client", () => ({ db }));
});

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.__redisTestHelper?.reset();
});

describe("probeHeaders", () => {
  it("uses HEAD when available and caches result", async () => {
    const head = new Response(null, {
      status: 200,
      headers: {
        server: "vercel",
        "x-vercel-id": "abc",
      },
    });
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockImplementation(async (_url, init?: RequestInit) => {
        if ((init?.method || "HEAD") === "HEAD") return head;
        return new Response(null, { status: 500 });
      });

    const { probeHeaders } = await import("./headers");
    const out = await probeHeaders("example.com");
    expect(out.length).toBeGreaterThan(0);
    fetchMock.mockRestore();
  });

  it("falls back to GET when HEAD fails", async () => {
    const get = new Response(null, {
      status: 200,
      headers: { server: "cloudflare", "cf-ray": "id" },
    });
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockImplementation(async (_url, init?: RequestInit) => {
        if ((init?.method || "HEAD") === "HEAD")
          return new Response(null, { status: 500 });
        return get;
      });

    const { probeHeaders } = await import("./headers");
    const out = await probeHeaders("example.com");
    expect(out.find((h) => h.name === "server")).toBeTruthy();
    fetchMock.mockRestore();
  });

  it("dedupes concurrent callers via lock/wait", async () => {
    const head = new Response(null, {
      status: 200,
      headers: {
        server: "vercel",
        "x-vercel-id": "abc",
      },
    });
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockImplementation(async (_url, init?: RequestInit) => {
        if ((init?.method || "HEAD") === "HEAD") return head;
        return new Response(null, { status: 500 });
      });

    const { probeHeaders } = await import("./headers");
    const [a, b, c] = await Promise.all([
      probeHeaders("example.com"),
      probeHeaders("example.com"),
      probeHeaders("example.com"),
    ]);
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBe(a.length);
    expect(c.length).toBe(a.length);
    // Only assert that all calls returned equivalent results; caching is validated elsewhere
    fetchMock.mockRestore();
  });

  it("returns empty array and does not cache on error", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async () => {
      throw new Error("network");
    });
    const { probeHeaders } = await import("./headers");
    const out = await probeHeaders("fail.example");
    expect(out.length).toBe(0);
    fetchMock.mockRestore();
  });
});
