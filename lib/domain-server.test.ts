import { describe, expect, it } from "vitest";
import {
  isAcceptableDomainInput,
  toRegistrableDomain,
} from "@/lib/domain-server";

describe("Server Domain Utilities", () => {
  describe("toRegistrableDomain", () => {
    it("should extract registrable domain from simple domains", () => {
      expect(toRegistrableDomain("example.com")).toBe("example.com");
      expect(toRegistrableDomain("test.org")).toBe("test.org");
    });

    it("should extract registrable domain from subdomains", () => {
      expect(toRegistrableDomain("www.example.com")).toBe("example.com");
      expect(toRegistrableDomain("api.subdomain.example.com")).toBe(
        "example.com",
      );
      expect(toRegistrableDomain("deep.nested.subdomain.example.co.uk")).toBe(
        "example.co.uk",
      );
    });

    it("should handle URLs and extract registrable domain", () => {
      expect(toRegistrableDomain("https://www.example.com/path")).toBe(
        "example.com",
      );
      expect(toRegistrableDomain("http://api.example.com:8080/api/v1")).toBe(
        "example.com",
      );
      expect(
        toRegistrableDomain("https://user:pass@subdomain.example.co.uk/"),
      ).toBe("example.co.uk");
    });

    it("should handle case insensitivity", () => {
      expect(toRegistrableDomain("WWW.EXAMPLE.COM")).toBe("example.com");
      expect(toRegistrableDomain("API.SUBDOMAIN.EXAMPLE.CO.UK")).toBe(
        "example.co.uk",
      );
    });

    it("should handle public suffixes correctly", () => {
      expect(toRegistrableDomain("example.co.uk")).toBe("example.co.uk");
      expect(toRegistrableDomain("test.github.io")).toBe("github.io");
      expect(toRegistrableDomain("www.test.github.io")).toBe("github.io");
    });

    it("should return null for IP addresses", () => {
      expect(toRegistrableDomain("192.168.1.1")).toBeNull();
      expect(toRegistrableDomain("127.0.0.1")).toBeNull();
      expect(toRegistrableDomain("::1")).toBeNull();
      expect(toRegistrableDomain("2001:db8::1")).toBeNull();
    });

    it("should return null for invalid or non-ICANN domains", () => {
      expect(toRegistrableDomain("localhost")).toBeNull();
      expect(toRegistrableDomain("example.internal")).toBeNull();
      expect(toRegistrableDomain("test.invalid")).toBeNull();
    });

    it("should return null for empty or invalid input", () => {
      expect(toRegistrableDomain("")).toBeNull();
      expect(toRegistrableDomain("   ")).toBeNull();
      expect(toRegistrableDomain(".")).toBeNull();
      expect(toRegistrableDomain("..")).toBeNull();
    });

    it("should handle punycode domains", () => {
      // Example: 中国.cn -> xn--fiqs8s.cn
      expect(toRegistrableDomain("xn--fiqs8s.cn")).toBe("xn--fiqs8s.cn");
      expect(toRegistrableDomain("www.xn--fiqs8s.cn")).toBe("xn--fiqs8s.cn");
    });

    it("should handle edge cases gracefully", () => {
      expect(toRegistrableDomain("http://")).toBeNull();
      expect(toRegistrableDomain("https://")).toBeNull();
      expect(toRegistrableDomain("://invalid")).toBeNull();
    });
  });

  describe("isAcceptableDomainInput", () => {
    it("should return true for valid domains", () => {
      expect(isAcceptableDomainInput("example.com")).toBe(true);
      expect(isAcceptableDomainInput("www.example.com")).toBe(true);
      expect(isAcceptableDomainInput("subdomain.example.co.uk")).toBe(true);
    });

    it("should return true for valid URLs", () => {
      expect(isAcceptableDomainInput("https://www.example.com/path")).toBe(
        true,
      );
      expect(isAcceptableDomainInput("http://api.example.com:8080")).toBe(true);
    });

    it("should return false for IP addresses", () => {
      expect(isAcceptableDomainInput("192.168.1.1")).toBe(false);
      expect(isAcceptableDomainInput("127.0.0.1")).toBe(false);
      expect(isAcceptableDomainInput("::1")).toBe(false);
    });

    it("should return false for invalid domains", () => {
      expect(isAcceptableDomainInput("localhost")).toBe(false);
      expect(isAcceptableDomainInput("example.internal")).toBe(false);
      expect(isAcceptableDomainInput("")).toBe(false);
      expect(isAcceptableDomainInput("   ")).toBe(false);
    });

    it("should handle case insensitivity", () => {
      expect(isAcceptableDomainInput("EXAMPLE.COM")).toBe(true);
      expect(isAcceptableDomainInput("WWW.EXAMPLE.COM")).toBe(true);
    });

    it("should return true for punycode domains", () => {
      expect(isAcceptableDomainInput("xn--fiqs8s.cn")).toBe(true);
    });
  });
});
