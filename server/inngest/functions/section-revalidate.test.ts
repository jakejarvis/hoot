import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Import dns lazily inside tests to avoid module-scope DB client init

describe("section-revalidate", () => {
  beforeAll(async () => {
    const { makePGliteDb } = await import("@/server/db/pglite");
    const { db } = await makePGliteDb();
    vi.doMock("@/server/db/client", () => ({ db }));
    const { makeInMemoryRedis } = await import("@/lib/redis-mock");
    const impl = makeInMemoryRedis();
    vi.doMock("@/lib/redis", () => impl);
  });

  beforeEach(async () => {
    const { resetPGliteDb } = await import("@/server/db/pglite");
    await resetPGliteDb();
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();
  });

  it("calls dns resolver for dns section", async () => {
    const { revalidateSection } = await import(
      "@/server/inngest/functions/section-revalidate"
    );
    const dnsMod = await import("@/server/services/dns");
    const spy = vi
      .spyOn(dnsMod, "resolveAll")
      .mockResolvedValue({ records: [], resolver: "cloudflare" });
    await revalidateSection("example.com", "dns");
    expect(spy).toHaveBeenCalledWith("example.com");
  });

  it("invokes headers probe", async () => {
    const { revalidateSection } = await import(
      "@/server/inngest/functions/section-revalidate"
    );
    const mod = await import("@/server/services/headers");
    const spy = vi
      .spyOn(mod, "probeHeaders")
      .mockResolvedValue({ headers: [], source: undefined });
    await revalidateSection("example.com", "headers");
    expect(spy).toHaveBeenCalledWith("example.com");
  });

  it("invokes hosting detect", async () => {
    const { revalidateSection } = await import(
      "@/server/inngest/functions/section-revalidate"
    );
    const mod = await import("@/server/services/hosting");
    const spy = vi.spyOn(mod, "detectHosting").mockResolvedValue({
      hostingProvider: { name: "", domain: null },
      emailProvider: { name: "", domain: null },
      dnsProvider: { name: "", domain: null },
      geo: {
        city: "",
        region: "",
        country: "",
        country_code: "",
        lat: null,
        lon: null,
      },
    });
    await revalidateSection("example.com", "hosting");
    expect(spy).toHaveBeenCalledWith("example.com");
  });

  it("invokes certificates fetch", async () => {
    const { revalidateSection } = await import(
      "@/server/inngest/functions/section-revalidate"
    );
    const mod = await import("@/server/services/certificates");
    const spy = vi.spyOn(mod, "getCertificates").mockResolvedValue([]);
    await revalidateSection("example.com", "certificates");
    expect(spy).toHaveBeenCalledWith("example.com");
  });

  it("invokes seo fetch", async () => {
    const { revalidateSection } = await import(
      "@/server/inngest/functions/section-revalidate"
    );
    const mod = await import("@/server/services/seo");
    const spy = vi.spyOn(mod, "getSeo").mockResolvedValue({
      meta: null,
      robots: null,
      preview: null,
      source: { finalUrl: null, status: null },
    });
    await revalidateSection("example.com", "seo");
    expect(spy).toHaveBeenCalledWith("example.com");
  });

  it("invokes registration lookup", async () => {
    const { revalidateSection } = await import(
      "@/server/inngest/functions/section-revalidate"
    );
    const mod = await import("@/server/services/registration");
    const spy = vi.spyOn(mod, "getRegistration").mockResolvedValue({
      domain: "example.com",
      tld: "com",
      isRegistered: true,
      registry: undefined,
      creationDate: undefined,
      updatedDate: undefined,
      expirationDate: undefined,
      deletionDate: undefined,
      transferLock: undefined,
      statuses: [],
      contacts: [],
      whoisServer: undefined,
      rdapServers: [],
      source: "rdap",
      registrar: undefined,
      reseller: undefined,
      nameservers: [],
      registrarProvider: { name: "", domain: null },
    });
    await revalidateSection("example.com", "registration");
    expect(spy).toHaveBeenCalledWith("example.com");
  });
});
