/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  lookup: vi.fn(async (_domain: string) => ({
    ok: true,
    error: null,
    record: {
      isRegistered: true,
      source: "rdap",
      registrar: { name: "GoDaddy" },
    },
  })),
}));

vi.mock("rdapper", async (importOriginal) => {
  const actual = await importOriginal<typeof import("rdapper")>();
  return {
    ...actual,
    lookup: hoisted.lookup,
  };
});

vi.mock("@/lib/domain-server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/domain-server")>();
  return {
    ...actual,
    toRegistrableDomain: (input: string) => {
      const v = (input ?? "").trim().toLowerCase();
      if (!v) return null;
      return v;
    },
  };
});

describe("getRegistration", () => {
  beforeEach(async () => {
    vi.resetModules();
    const { makePGliteDb } = await import("@/server/db/pglite");
    const { db } = await makePGliteDb();
    vi.doMock("@/server/db/client", () => ({ db }));
    const { makeInMemoryRedis } = await import("@/lib/redis-mock");
    const impl = makeInMemoryRedis();
    vi.doMock("@/lib/redis", () => impl);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();
  });

  it("returns cached record when present (DB fast-path, rdapper not called)", async () => {
    const { upsertDomain } = await import("@/server/repos/domains");
    const { upsertRegistration } = await import("@/server/repos/registrations");
    const { lookup } = await import("rdapper");
    const spy = lookup as unknown as import("vitest").Mock;
    spy.mockClear();

    const d = await upsertDomain({
      name: "example.com",
      tld: "com",
      unicodeName: "example.com",
    });
    await upsertRegistration({
      domainId: d.id,
      isRegistered: true,
      registry: "verisign",
      statuses: [],
      contacts: [],
      whoisServer: null,
      rdapServers: [],
      source: "rdap",
      fetchedAt: new Date("2024-01-01T00:00:00.000Z"),
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      transferLock: null,
      creationDate: null,
      updatedDate: null,
      expirationDate: null,
      deletionDate: null,
      registrarProviderId: null,
      resellerProviderId: null,
      nameservers: [],
    });

    const { getRegistration } = await import("./registration");
    const rec = await getRegistration("example.com");
    expect(rec.isRegistered).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it("loads via rdapper, creates registrar provider when missing, and caches", async () => {
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();
    const { getRegistration } = await import("./registration");
    const rec = await getRegistration("example.com");
    expect(rec.isRegistered).toBe(true);
    expect(rec.registrarProvider?.name).toBe("GoDaddy");

    // Verify provider row exists and is linked
    const { db } = await import("@/server/db/client");
    const { domains, providers, registrations } = await import(
      "@/server/db/schema"
    );
    const { eq } = await import("drizzle-orm");
    const d = await db
      .select({ id: domains.id })
      .from(domains)
      .where(eq(domains.name, "example.com"))
      .limit(1);
    const row = (
      await db
        .select({ registrarProviderId: registrations.registrarProviderId })
        .from(registrations)
        .where(eq(registrations.domainId, d[0].id))
        .limit(1)
    )[0];
    expect(row.registrarProviderId).toBeTruthy();
    const prov = (
      await db
        .select({ name: providers.name })
        .from(providers)
        .where(eq(providers.id, row.registrarProviderId as string))
        .limit(1)
    )[0];
    expect(prov?.name).toBe("GoDaddy");
  });

  it("sets shorter TTL for unregistered domains (observed via second call)", async () => {
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();
    const { lookup } = await import("rdapper");
    (lookup as unknown as import("vitest").Mock).mockResolvedValueOnce({
      ok: true,
      error: null,
      record: { isRegistered: false, source: "rdap" },
    });
    // Freeze time for deterministic TTL checks
    vi.useFakeTimers();
    try {
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
    } finally {
      vi.useRealTimers();
    }
  });
});
