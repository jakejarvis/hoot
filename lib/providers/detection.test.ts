import { describe, expect, it } from "vitest";
import {
  detectDnsProvider,
  detectEmailProvider,
  detectHostingProvider,
  resolveRegistrarDomain,
} from "@/lib/providers/detection";
import type { HttpHeader } from "@/lib/providers/types";

describe("Provider Detection System", () => {
  describe("detectHostingProvider", () => {
    it("should detect Vercel from server header", () => {
      const headers: HttpHeader[] = [{ name: "server", value: "Vercel" }];
      const result = detectHostingProvider(headers);
      expect(result).toEqual({ name: "Vercel", domain: "vercel.com" });
    });

    it("should detect Vercel from x-vercel-id header", () => {
      const headers: HttpHeader[] = [{ name: "x-vercel-id", value: "abc123" }];
      const result = detectHostingProvider(headers);
      expect(result).toEqual({ name: "Vercel", domain: "vercel.com" });
    });

    it("should detect Netlify", () => {
      const headers: HttpHeader[] = [{ name: "server", value: "Netlify" }];
      const result = detectHostingProvider(headers);
      expect(result).toEqual({ name: "Netlify", domain: "netlify.com" });
    });

    it("should detect GitHub Pages", () => {
      const headers: HttpHeader[] = [{ name: "server", value: "GitHub.com" }];
      const result = detectHostingProvider(headers);
      expect(result).toEqual({ name: "GitHub Pages", domain: "github.com" });
    });

    it("should handle case-insensitive header names and values", () => {
      const headers: HttpHeader[] = [{ name: "SERVER", value: "VERCEL" }];
      const result = detectHostingProvider(headers);
      expect(result).toEqual({ name: "Vercel", domain: "vercel.com" });
    });

    it("should return Unknown for unmatched headers", () => {
      const headers: HttpHeader[] = [
        { name: "server", value: "unknown-server" },
      ];
      const result = detectHostingProvider(headers);
      expect(result).toEqual({ name: "Unknown", domain: null });
    });

    it("should return Unknown for empty headers", () => {
      const headers: HttpHeader[] = [];
      const result = detectHostingProvider(headers);
      expect(result).toEqual({ name: "Unknown", domain: null });
    });

    it("should match headers with substring values", () => {
      const headers: HttpHeader[] = [
        { name: "x-powered-by", value: "WordPress VIP Platform" },
      ];
      const result = detectHostingProvider(headers);
      expect(result).toEqual({ name: "WordPress VIP", domain: "wpvip.com" });
    });
  });

  describe("detectEmailProvider", () => {
    it("should detect Google Workspace from MX records", () => {
      const mxHosts = ["aspmx.l.google.com", "alt1.aspmx.l.google.com"];
      const result = detectEmailProvider(mxHosts);
      expect(result).toEqual({
        name: "Google Workspace",
        domain: "google.com",
      });
    });

    it("should detect Google Workspace from single smtp.google.com", () => {
      const mxHosts = ["smtp.google.com"];
      const result = detectEmailProvider(mxHosts);
      expect(result).toEqual({
        name: "Google Workspace",
        domain: "google.com",
      });
    });

    it("should detect Microsoft 365", () => {
      const mxHosts = ["example-com.mail.protection.outlook.com"];
      const result = detectEmailProvider(mxHosts);
      expect(result).toEqual({ name: "Microsoft 365", domain: "office.com" });
    });

    it("should return first hostname when no provider matches", () => {
      const mxHosts = ["mx1.custom-provider.com", "mx2.custom-provider.com"];
      const result = detectEmailProvider(mxHosts);
      expect(result).toEqual({
        name: "custom-provider.com",
        domain: "custom-provider.com",
      });
    });

    it("should return Unknown for empty MX records", () => {
      const mxHosts: string[] = [];
      const result = detectEmailProvider(mxHosts);
      expect(result).toEqual({ name: "Unknown", domain: null });
    });

    it("should handle case-insensitive MX records", () => {
      const mxHosts = ["ASPMX.L.GOOGLE.COM"];
      const result = detectEmailProvider(mxHosts);
      expect(result).toEqual({
        name: "Google Workspace",
        domain: "google.com",
      });
    });
  });

  describe("detectDnsProvider", () => {
    it("should detect Cloudflare from NS records", () => {
      const nsHosts = ["ns1.cloudflare.com", "ns2.cloudflare.com"];
      const result = detectDnsProvider(nsHosts);
      expect(result).toEqual({ name: "Cloudflare", domain: "cloudflare.com" });
    });

    it("should detect Amazon Route 53", () => {
      const nsHosts = ["ns-123.awsdns-12.com"];
      const result = detectDnsProvider(nsHosts);
      expect(result).toEqual({
        name: "Amazon Route 53",
        domain: "aws.amazon.com",
      });
    });

    it("should return first hostname when no provider matches", () => {
      const nsHosts = ["ns1.custom-dns.com", "ns2.custom-dns.com"];
      const result = detectDnsProvider(nsHosts);
      expect(result).toEqual({
        name: "custom-dns.com",
        domain: "custom-dns.com",
      });
    });

    it("should return Unknown for empty NS records", () => {
      const nsHosts: string[] = [];
      const result = detectDnsProvider(nsHosts);
      expect(result).toEqual({ name: "Unknown", domain: null });
    });
  });

  describe("resolveRegistrarDomain", () => {
    it("should resolve exact registrar name match", () => {
      const result = resolveRegistrarDomain("GoDaddy Inc.");
      expect(result).toBe("godaddy.com");
    });

    it("should resolve partial registrar name match", () => {
      const result = resolveRegistrarDomain("GoDaddy LLC");
      expect(result).toBe("godaddy.com");
    });

    it("should resolve using aliases", () => {
      const result = resolveRegistrarDomain("Go Daddy");
      expect(result).toBe("godaddy.com");
    });

    it("should handle case insensitive matching", () => {
      const result = resolveRegistrarDomain("godaddy inc.");
      expect(result).toBe("godaddy.com");
    });

    it("should return null for unknown registrar", () => {
      const result = resolveRegistrarDomain("Unknown Registrar Corp");
      expect(result).toBeNull();
    });

    it("should return null for empty input", () => {
      const result = resolveRegistrarDomain("");
      expect(result).toBeNull();
    });

    it("should return null for null input", () => {
      // biome-ignore lint/suspicious/noExplicitAny: Testing invalid input
      const result = resolveRegistrarDomain(null as any);
      expect(result).toBeNull();
    });
  });
});
