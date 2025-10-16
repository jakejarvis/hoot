/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(async () => {
    const { makePGliteDb } = await import("@/server/db/pglite");
    const { db } = await makePGliteDb();
    vi.doMock("@/server/db/client", () => ({ db }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.__redisTestHelper.reset();
  });

  it("returns cached record when present", async () => {
    globalThis.__redisTestHelper.store.set("reg:example.com", {
      isRegistered: true,
      source: "rdap",
    });
    const { getRegistration } = await import("./registration");
    const rec = await getRegistration("example.com");
    expect(rec.isRegistered).toBe(true);
  });

  it("loads via rdapper and caches on miss", async () => {
    globalThis.__redisTestHelper.reset();
    const { getRegistration } = await import("./registration");
    const rec = await getRegistration("example.com");
    expect(rec.isRegistered).toBe(true);
    expect(rec.registrarProvider?.name).toBe("GoDaddy");
  });

  it("sets shorter TTL for unregistered domains (observed via second call)", async () => {
    globalThis.__redisTestHelper.reset();
    const { lookupDomain } = await import("rdapper");
    (lookupDomain as unknown as import("vitest").Mock).mockResolvedValueOnce({
      ok: true,
      error: null,
      record: { isRegistered: false, source: "rdap" },
    });
    const { getRegistration } = await import("./registration");
    const rec = await getRegistration("unregistered.test");
    expect(rec.isRegistered).toBe(false);
  });

  it("throws on invalid input", async () => {
    const { getRegistration } = await import("./registration");
    await expect(getRegistration("")).rejects.toThrow("Invalid domain");
  });
});
