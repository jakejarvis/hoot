/* @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupIpMeta } from "./ip";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("lookupIpMeta", () => {
  it("parses ipwho.is response and derives owner and domain", async () => {
    const resp = {
      city: "San Francisco",
      region: "CA",
      country: "United States",
      country_code: "US",
      latitude: 37.7,
      longitude: -122.4,
      connection: {
        org: "Cloudflare",
        isp: "Cloudflare, Inc",
        domain: "cloudflare.com",
      },
    };
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(resp), { status: 200 }));
    const res = await lookupIpMeta("1.2.3.4");
    expect(res.geo.city).toBe("San Francisco");
    expect(res.owner).toBe("Cloudflare");
    expect(res.domain).toBe("cloudflare.com");
    fetchMock.mockRestore();
  });

  it("returns defaults on error", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockRejectedValue(new Error("boom"));
    const res = await lookupIpMeta("1.2.3.4");
    expect(res.owner).toBeNull();
    expect(res.geo.country).toBe("");
    expect(res.domain).toBeNull();
    fetchMock.mockRestore();
  });
});
