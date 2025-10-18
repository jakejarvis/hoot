import { describe, expect, it } from "vitest";
import {
  ttlForCertificates,
  ttlForDnsRecord,
  ttlForRegistration,
} from "@/server/db/ttl";

describe("TTL policy", () => {
  it("registration: 24h when registered and far from expiry", () => {
    const now = new Date("2024-01-01T00:00:00.000Z");
    const exp = new Date("2024-02-01T00:00:00.000Z");
    const d = ttlForRegistration(now, true, exp);
    expect(d.getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("registration: 6h when unregistered", () => {
    const now = new Date("2024-01-01T00:00:00.000Z");
    const d = ttlForRegistration(now, false, null);
    expect(d.getTime() - now.getTime()).toBe(6 * 60 * 60 * 1000);
  });

  it("registration: <=1h when expiry within 7d", () => {
    const now = new Date("2024-01-01T00:00:00.000Z");
    const exp = new Date("2024-01-05T00:00:00.000Z");
    const d = ttlForRegistration(now, true, exp);
    expect(d.getTime() - now.getTime()).toBe(60 * 60 * 1000);
  });

  it("dns: default 1h when ttl missing", () => {
    const now = new Date("2024-01-01T00:00:00.000Z");
    const d = ttlForDnsRecord(now, undefined);
    expect(d.getTime() - now.getTime()).toBe(60 * 60 * 1000);
  });

  it("dns: cap at 24h", () => {
    const now = new Date("2024-01-01T00:00:00.000Z");
    const d = ttlForDnsRecord(now, 3 * 24 * 60 * 60);
    expect(d.getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("certs: before valid_to and within 24h window", () => {
    const now = new Date("2024-01-01T00:00:00.000Z");
    const validTo = new Date("2024-01-04T00:00:00.000Z");
    const d = ttlForCertificates(now, validTo);
    // min(now+24h, valid_to-48h) => valid_to-48h here (Jan 2)
    expect(d.toISOString()).toBe(
      new Date("2024-01-02T00:00:00.000Z").toISOString(),
    );
  });
});
