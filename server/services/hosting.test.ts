/* @vitest-environment node */

import type { Mock } from "vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { detectHosting } from "./hosting";

// Mocks for dependencies used by detectHosting
vi.mock("@/server/services/dns", () => ({
  resolveAll: vi.fn(async (_domain: string) => ({
    records: [],
    source: "mock",
  })),
}));

vi.mock("@/server/services/headers", () => ({
  probeHeaders: vi.fn(
    async (_domain: string) => [] as { name: string; value: string }[],
  ),
}));

vi.mock("@/server/services/ip", () => ({
  lookupIpMeta: vi.fn(async (_ip: string) => ({
    geo: {
      city: "",
      region: "",
      country: "",
      lat: null,
      lon: null,
      emoji: null,
    },
    owner: null,
    domain: null,
  })),
}));

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.__redisTestHelper?.reset();
});

describe("detectHosting", () => {
  it("returns known providers when signals match (Vercel/Google/Cloudflare)", async () => {
    // Arrange
    const { resolveAll } = await import("@/server/services/dns");
    const { probeHeaders } = await import("@/server/services/headers");
    const { lookupIpMeta } = await import("@/server/services/ip");

    (resolveAll as unknown as Mock).mockResolvedValue({
      records: [
        { type: "A", name: "example.com", value: "1.2.3.4", ttl: 60 },
        {
          type: "MX",
          name: "example.com",
          value: "aspmx.l.google.com",
          ttl: 300,
          priority: 10,
        },
        {
          type: "NS",
          name: "example.com",
          value: "ns1.cloudflare.com",
          ttl: 600,
        },
      ],
      source: "mock",
    });
    (probeHeaders as unknown as Mock).mockResolvedValue([
      { name: "server", value: "Vercel" },
      { name: "x-vercel-id", value: "abc" },
    ]);
    (lookupIpMeta as unknown as Mock).mockResolvedValue({
      geo: {
        city: "SF",
        region: "CA",
        country: "US",
        lat: 1,
        lon: 2,
        emoji: "🇺🇸",
      },
      owner: null,
      domain: null,
    });

    // Act
    const result = await detectHosting("example.com");

    // Assert
    expect(result.hostingProvider.name).toBe("Vercel");
    expect(result.hostingProvider.domain).toBe("vercel.com");
    expect(result.emailProvider.name).toBe("Google Workspace");
    expect(result.emailProvider.domain).toBe("google.com");
    expect(result.dnsProvider.name).toBe("Cloudflare");
    expect(result.dnsProvider.domain).toBe("cloudflare.com");
    expect(result.geo.country).toBe("US");
  });

  it("sets hosting to none when no A record is present", async () => {
    const { resolveAll } = await import("./dns");
    (resolveAll as unknown as Mock).mockResolvedValue({
      records: [
        {
          type: "MX",
          name: "example.com",
          value: "aspmx.l.google.com",
          ttl: 300,
          priority: 10,
        },
        {
          type: "NS",
          name: "example.com",
          value: "ns1.cloudflare.com",
          ttl: 600,
        },
      ],
      source: "mock",
    });

    const result = await detectHosting("no-a.example");
    expect(result.hostingProvider.name.toLowerCase()).toBe("not configured");
    expect(result.hostingProvider.domain).toBeNull();
  });

  it("falls back to IP owner when hosting is unknown and IP owner exists", async () => {
    const { resolveAll } = await import("./dns");
    const { probeHeaders } = await import("./headers");
    const { lookupIpMeta } = await import("./ip");

    (resolveAll as unknown as Mock).mockResolvedValue({
      records: [{ type: "A", name: "x", value: "9.9.9.9", ttl: 60 }],
      source: "mock",
    });
    (probeHeaders as unknown as Mock).mockResolvedValue([]);
    (lookupIpMeta as unknown as Mock).mockResolvedValue({
      geo: {
        city: "",
        region: "",
        country: "",
        lat: null,
        lon: null,
        emoji: null,
      },
      owner: "My ISP",
      domain: "isp.example",
    });

    const result = await detectHosting("owner.example");
    expect(result.hostingProvider.name).toBe("My ISP");
    expect(result.hostingProvider.domain).toBe("isp.example");
  });

  it("falls back to root domains for email and DNS when unknown", async () => {
    const { resolveAll } = await import("./dns");
    const { probeHeaders } = await import("./headers");
    (resolveAll as unknown as Mock).mockResolvedValue({
      records: [
        { type: "A", name: "example.com", value: "1.1.1.1", ttl: 60 },
        {
          type: "MX",
          name: "example.com",
          value: "mx.mailprovider.example.com",
          ttl: 300,
          priority: 10,
        },
        {
          type: "NS",
          name: "example.com",
          value: "ns1.dnsprovider.example.net",
          ttl: 600,
        },
      ],
      source: "mock",
    });
    (probeHeaders as unknown as Mock).mockResolvedValue([]);

    const result = await detectHosting("fallbacks.example");
    expect(result.emailProvider.domain).toBe("example.com");
    expect(result.dnsProvider.domain).toBe("example.net");
  });
});
