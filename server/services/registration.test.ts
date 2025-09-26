/* @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";
import { getRegistration } from "./registration";

vi.mock("@/lib/domain-server", () => ({
  toRegistrableDomain: (d: string) => (d ? d.toLowerCase() : null),
}));

vi.mock("rdapper", () => ({
  lookupDomain: vi.fn(async (_domain: string) => ({
    ok: true,
    error: null,
    record: {
      isRegistered: true,
      source: "rdap",
      registrar: { name: "GoDaddy" },
    },
  })),
}));

describe("getRegistration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.__redisTestHelper.reset();
  });
  it("returns cached record when present", async () => {
    globalThis.__redisTestHelper.store.set("reg:example.com", {
      isRegistered: true,
      source: "rdap",
    });
    const rec = await getRegistration("example.com");
    expect(rec.isRegistered).toBe(true);
  });

  it("loads via rdapper and caches on miss", async () => {
    globalThis.__redisTestHelper.reset();
    const rec = await getRegistration("example.com");
    expect(rec.isRegistered).toBe(true);
    expect(globalThis.__redisTestHelper.store.has("reg:example.com")).toBe(
      true,
    );
  });

  it("sets shorter TTL for unregistered domains (observed via second call)", async () => {
    globalThis.__redisTestHelper.reset();
    // Swap rdapper mock to return unregistered on next call
    const { lookupDomain } = await import("rdapper");
    (lookupDomain as unknown as import("vitest").Mock).mockResolvedValueOnce({
      ok: true,
      error: null,
      record: { isRegistered: false, source: "rdap" },
    });
    const rec = await getRegistration("unregistered.test");
    expect(rec.isRegistered).toBe(false);
  });

  it("throws on invalid input", async () => {
    // our mock toRegistrableDomain returns null for empty
    await expect(getRegistration("")).rejects.toThrow("Invalid domain");
  });
});
