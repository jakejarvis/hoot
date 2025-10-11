/* @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";
import { probeHeaders } from "./headers";

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

    const out = await probeHeaders("example.com");
    expect(out.length).toBeGreaterThan(0);
    expect(globalThis.__redisTestHelper.store.has("headers:example.com")).toBe(
      true,
    );
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

    const out = await probeHeaders("example.com");
    expect(out.find((h) => h.name === "server")).toBeTruthy();
    expect(globalThis.__redisTestHelper.store.has("headers:example.com")).toBe(
      true,
    );
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

    const [a, b, c] = await Promise.all([
      probeHeaders("example.com"),
      probeHeaders("example.com"),
      probeHeaders("example.com"),
    ]);
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBe(a.length);
    expect(c.length).toBe(a.length);
    // HEAD called once; no GETs should be needed after first completes
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockRestore();
  });

  it("returns empty array and does not cache on error", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async () => {
      throw new Error("network");
    });
    const out = await probeHeaders("example.com");
    expect(out).toEqual([]);
    expect(globalThis.__redisTestHelper.store.has("headers:example.com")).toBe(
      false,
    );
    fetchMock.mockRestore();
  });
});
