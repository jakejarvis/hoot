import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidateSection } from "@/server/inngest/functions/section-revalidate";
import * as dnsSvc from "@/server/services/dns";

describe("section-revalidate", () => {
  beforeEach(() => {
    globalThis.__redisTestHelper.reset();
  });

  it("calls dns resolver for dns section", async () => {
    const spy = vi
      .spyOn(dnsSvc, "resolveAll")
      .mockResolvedValue({ records: [], resolver: "cloudflare" });
    await revalidateSection("example.com", "dns");
    expect(spy).toHaveBeenCalledWith("example.com");
  });

  it("invokes headers probe", async () => {
    const mod = await import("@/server/services/headers");
    const spy = vi.spyOn(mod, "probeHeaders").mockResolvedValue([]);
    await revalidateSection("example.com", "headers");
    expect(spy).toHaveBeenCalledWith("example.com");
  });

  it("invokes hosting detect", async () => {
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
    const mod = await import("@/server/services/certificates");
    const spy = vi.spyOn(mod, "getCertificates").mockResolvedValue([]);
    await revalidateSection("example.com", "certificates");
    expect(spy).toHaveBeenCalledWith("example.com");
  });

  it("invokes seo fetch", async () => {
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
});
