import { beforeEach, describe, expect, it, vi } from "vitest";
import { sectionRevalidate } from "@/server/inngest/functions/section-revalidate";
import * as dnsSvc from "@/server/services/dns";

describe("section-revalidate", () => {
  beforeEach(() => {
    globalThis.__redisTestHelper.reset();
  });

  it("calls dns resolver for dns section", async () => {
    const spy = vi
      .spyOn(dnsSvc, "resolveAll")
      .mockResolvedValue({ records: [], resolver: "cloudflare" });
    // simulate invocation
    // InngestFunction.fn is private; invoke the handler by importing services directly and asserting behavior.
    await (
      sectionRevalidate as unknown as {
        handler: (ctx: unknown) => Promise<unknown>;
      }
    ).handler({
      event: {
        name: "section/revalidate",
        data: { domain: "example.com", section: "dns" },
      },
      step: {} as unknown,
      runId: "test",
    } as unknown);
    expect(spy).toHaveBeenCalledWith("example.com");
  });

  it("invokes headers probe", async () => {
    const mod = await import("@/server/services/headers");
    const spy = vi.spyOn(mod, "probeHeaders").mockResolvedValue([]);
    await (
      sectionRevalidate as unknown as {
        handler: (ctx: unknown) => Promise<unknown>;
      }
    ).handler({
      event: {
        name: "section/revalidate",
        data: { domain: "example.com", section: "headers" },
      },
      step: {} as unknown,
      runId: "test",
    } as unknown);
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
    await (
      sectionRevalidate as unknown as {
        handler: (ctx: unknown) => Promise<unknown>;
      }
    ).handler({
      event: {
        name: "section/revalidate",
        data: { domain: "example.com", section: "hosting" },
      },
      step: {} as unknown,
      runId: "test",
    } as unknown);
    expect(spy).toHaveBeenCalledWith("example.com");
  });
});
