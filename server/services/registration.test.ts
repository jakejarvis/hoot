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
    vi.resetModules();
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
    // Freeze time for deterministic TTL checks
    vi.useFakeTimers();
    const fixedNow = new Date("2024-01-01T00:00:00.000Z");
    vi.setSystemTime(fixedNow);

    const { getRegistration } = await import("./registration");
    const rec = await getRegistration("unregistered.test");
    expect(rec.isRegistered).toBe(false);

    // Verify stored TTL is 6h from now for unregistered
    const { db } = await import("@/server/db/client");
    const { domains, registrations } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const d = await db
      .select({ id: domains.id })
      .from(domains)
      .where(eq(domains.name, "unregistered.test"))
      .limit(1);
    const row = (
      await db
        .select()
        .from(registrations)
        .where(eq(registrations.domainId, d[0].id))
        .limit(1)
    )[0];
    expect(row).toBeTruthy();
    expect(row.isRegistered).toBe(false);
    expect(row.expiresAt.getTime() - fixedNow.getTime()).toBe(
      6 * 60 * 60 * 1000,
    );

    +vi.useRealTimers();
  });

  it("throws on invalid input", async () => {
    const { getRegistration } = await import("./registration");
    await expect(getRegistration("")).rejects.toThrow("Invalid domain");
  });
});
