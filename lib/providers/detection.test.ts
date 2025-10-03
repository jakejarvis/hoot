import { describe, expect, it } from "vitest";
import {
  detectCertificateAuthority,
  detectDnsProvider,
  detectEmailProvider,
  detectHostingProvider,
  detectRegistrar,
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
    const res = detectEmailProvider(["aspmx.l.google.com."]);
    expect(res.name).toBe("Google Workspace");
    expect(res.domain).toBe("google.com");
  });

  it("detects DNS from NS (Cloudflare)", () => {
    const res = detectDnsProvider(["ns1.cloudflare.com", "ns2.cloudflare.com"]);
    expect(res.name).toBe("Cloudflare");
    expect(res.domain).toBe("cloudflare.com");
  });

  it("detects DNS from NS (Amazon Route 53)", () => {
    const res = detectDnsProvider([
      "ns-2048.awsdns-64.com",
      "ns-2049.awsdns-65.net",
    ]);
    expect(res.name).toBe("Amazon Route 53");
    expect(res.domain).toBe("aws.amazon.com");
  });

  it("detects registrar from name (GoDaddy)", () => {
    const res = detectRegistrar("GoDaddy Inc.");
    expect(res.name).toBe("GoDaddy");
    expect(res.domain).toBe("godaddy.com");
  });

  it("detects CA from issuer string (Let's Encrypt)", () => {
    const res = detectCertificateAuthority("Let's Encrypt R3");
    expect(res.name).toBe("Let's Encrypt");
    expect(res.domain).toBe("letsencrypt.org");
  });

  it("detects CA from issuer string (Let's Encrypt R10)", () => {
    const res = detectCertificateAuthority("R10");
    expect(res.name).toBe("Let's Encrypt");
    expect(res.domain).toBe("letsencrypt.org");
  });
});
