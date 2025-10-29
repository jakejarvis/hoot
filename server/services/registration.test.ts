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
    const { makePGliteDb } = await import("@/lib/db/pglite");
    const { db } = await makePGliteDb();
    vi.doMock("@/lib/db/client", () => ({ db }));
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
    const { upsertDomain } = await import("@/lib/db/repos/domains");
    const { upsertRegistration } = await import("@/lib/db/repos/registrations");
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

    // Verify Redis cache was updated when hitting Postgres cache
    const { redis } = await import("@/lib/redis");
    const { getRegistrationCacheKey } = await import(
      "@/lib/db/repos/registrations"
    );
    const cached = await redis.get(getRegistrationCacheKey("example.com"));
    expect(cached).toBe("1"); // "1" means registered
  });

  it("loads via rdapper, creates registrar provider when missing, and caches", async () => {
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();
    const { getRegistration } = await import("./registration");
    const rec = await getRegistration("example.com");
    expect(rec.isRegistered).toBe(true);
    expect(rec.registrarProvider?.name).toBe("GoDaddy");

    // Verify provider row exists and is linked
    const { db } = await import("@/lib/db/client");
    const { domains, providers, registrations } = await import(
      "@/lib/db/schema"
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

  it("caches unregistered domains in Redis only (not Postgres)", async () => {
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();
    const { lookup } = await import("rdapper");
    (lookup as unknown as import("vitest").Mock).mockResolvedValueOnce({
      ok: true,
      error: null,
      record: { isRegistered: false, source: "rdap" },
    });

    const { getRegistration } = await import("./registration");
    const rec = await getRegistration("unregistered.test");
    expect(rec.isRegistered).toBe(false);

    // Verify NOT stored in Postgres
    const { db } = await import("@/lib/db/client");
    const { domains } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const d = await db
      .select({ id: domains.id })
      .from(domains)
      .where(eq(domains.name, "unregistered.test"))
      .limit(1);
    expect(d.length).toBe(0);

    // Verify cached in Redis
    const { redis } = await import("@/lib/redis");
    const { getRegistrationCacheKey } = await import(
      "@/lib/db/repos/registrations"
    );
    const cached = await redis.get(
      getRegistrationCacheKey("unregistered.test"),
    );
    expect(cached).toBe("0"); // "0" means unregistered
  });

  it("returns cached unregistered status from Redis without calling rdapper", async () => {
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();

    // Pre-cache unregistered status using the canonical helper
    const { REDIS_TTL_UNREGISTERED } = await import("@/lib/constants");
    const { setRegistrationStatusInCache } = await import(
      "@/lib/db/repos/registrations"
    );
    await setRegistrationStatusInCache(
      "cached-unregistered.test",
      false,
      REDIS_TTL_UNREGISTERED,
    );

    const { lookup } = await import("rdapper");
    const spy = lookup as unknown as import("vitest").Mock;
    spy.mockClear();

    const { getRegistration } = await import("./registration");
    await expect(getRegistration("cached-unregistered.test")).rejects.toThrow(
      /not registered/i,
    );

    // rdapper should not have been called
    expect(spy).not.toHaveBeenCalled();
  });

  it("caches registered domains in both Redis and Postgres", async () => {
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();
    const { lookup } = await import("rdapper");
    (lookup as unknown as import("vitest").Mock).mockResolvedValueOnce({
      ok: true,
      error: null,
      record: {
        isRegistered: true,
        source: "rdap",
        registrar: { name: "Test Registrar" },
      },
    });

    const { getRegistration } = await import("./registration");
    const rec = await getRegistration("registered.test");
    expect(rec.isRegistered).toBe(true);

    // Verify stored in Postgres
    const { db } = await import("@/lib/db/client");
    const { domains, registrations } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const d = await db
      .select({ id: domains.id })
      .from(domains)
      .where(eq(domains.name, "registered.test"))
      .limit(1);
    expect(d.length).toBe(1);

    const reg = await db
      .select()
      .from(registrations)
      .where(eq(registrations.domainId, d[0].id))
      .limit(1);
    expect(reg.length).toBe(1);
    expect(reg[0].isRegistered).toBe(true);

    // Verify cached in Redis
    const { redis } = await import("@/lib/redis");
    const { getRegistrationCacheKey } = await import(
      "@/lib/db/repos/registrations"
    );
    const cached = await redis.get(getRegistrationCacheKey("registered.test"));
    expect(cached).toBe("1"); // "1" means registered
  });
});
