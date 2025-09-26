import { describe, expect, it } from "vitest";
import {
  detectDnsProvider,
  detectEmailProvider,
  detectHostingProvider,
  resolveRegistrarDomain,
} from "./detection";

describe("provider detection", () => {
  it("detects hosting from headers (Vercel)", () => {
    const headers = [
      { name: "Server", value: "Vercel" },
      { name: "x-vercel-id", value: "abc" },
    ];
    const res = detectHostingProvider(headers);
    expect(res.name).toBe("Vercel");
    expect(res.domain).toBe("vercel.com");
  });

  it("detects email from MX (Google)", () => {
    const res = detectEmailProvider(["aspmx.l.google.com"]);
    expect(res.name).toBe("Google Workspace");
    expect(res.domain).toBe("google.com");
  });

  it("detects DNS from NS (Cloudflare)", () => {
    const res = detectDnsProvider(["ns1.cloudflare.com", "ns2.cloudflare.com"]);
    expect(res.name).toBe("Cloudflare");
    expect(res.domain).toBe("cloudflare.com");
  });

  it("resolves registrar domain from aliases", () => {
    expect(resolveRegistrarDomain("GoDaddy Inc.")).toBe("godaddy.com");
  });
});
