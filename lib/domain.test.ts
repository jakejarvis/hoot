import { describe, expect, it } from "vitest";
import { isValidDomain, normalizeDomainInput } from "@/lib/domain";

describe("Domain Utilities", () => {
  describe("normalizeDomainInput", () => {
    it("should handle simple domain names", () => {
      expect(normalizeDomainInput("example.com")).toBe("example.com");
      expect(normalizeDomainInput("subdomain.example.com")).toBe(
        "subdomain.example.com",
      );
    });

    it("should remove www prefix", () => {
      expect(normalizeDomainInput("www.example.com")).toBe("example.com");
      expect(normalizeDomainInput("WWW.EXAMPLE.COM")).toBe("example.com");
    });

    it("should handle URLs with schemes", () => {
      expect(normalizeDomainInput("https://example.com")).toBe("example.com");
      expect(normalizeDomainInput("http://example.com")).toBe("example.com");
      expect(normalizeDomainInput("ftp://example.com")).toBe("example.com");
    });

    it("should handle URLs with paths, queries, and fragments", () => {
      expect(normalizeDomainInput("https://example.com/path")).toBe(
        "example.com",
      );
      expect(normalizeDomainInput("https://example.com/path?query=value")).toBe(
        "example.com",
      );
      expect(normalizeDomainInput("https://example.com/path#fragment")).toBe(
        "example.com",
      );
      expect(
        normalizeDomainInput("https://example.com/path?query=value#fragment"),
      ).toBe("example.com");
    });

    it("should handle URLs with authentication", () => {
      expect(normalizeDomainInput("https://user:pass@example.com")).toBe(
        "example.com",
      );
      expect(normalizeDomainInput("http://username@example.com")).toBe(
        "example.com",
      );
    });

    it("should handle URLs with ports", () => {
      expect(normalizeDomainInput("https://example.com:8080")).toBe(
        "example.com",
      );
      expect(normalizeDomainInput("example.com:3000")).toBe("example.com");
    });

    it("should handle trailing dots", () => {
      expect(normalizeDomainInput("example.com.")).toBe("example.com");
      expect(normalizeDomainInput("www.example.com.")).toBe("example.com");
    });

    it("should handle whitespace and case", () => {
      expect(normalizeDomainInput("  EXAMPLE.COM  ")).toBe("example.com");
      expect(normalizeDomainInput("\t\nEXAMPLE.COM\r\n")).toBe("example.com");
    });

    it("should handle complex URLs", () => {
      expect(
        normalizeDomainInput(
          "https://user:pass@www.example.com:8080/path?query=value#fragment",
        ),
      ).toBe("example.com");
    });

    it("should handle edge cases", () => {
      expect(normalizeDomainInput("")).toBe("");
      expect(normalizeDomainInput("   ")).toBe("");
    });

    it("should handle invalid URLs gracefully", () => {
      expect(normalizeDomainInput("http://")).toBe("");
      expect(normalizeDomainInput("https://")).toBe("");
      expect(normalizeDomainInput("://invalid")).toBe(":");
    });

    it("should handle punycode domains", () => {
      expect(normalizeDomainInput("xn--fsq.xn--0zwm56d")).toBe(
        "xn--fsq.xn--0zwm56d",
      );
    });
  });

  describe("isValidDomain", () => {
    it("should validate correct domain names", () => {
      expect(isValidDomain("example.com")).toBe(true);
      expect(isValidDomain("subdomain.example.com")).toBe(true);
      expect(isValidDomain("deep.subdomain.example.com")).toBe(true);
      expect(isValidDomain("test-domain.co.uk")).toBe(true);
    });

    it("should validate punycode domains", () => {
      expect(isValidDomain("xn--fsq.xn--0zwm56d")).toBe(true);
      expect(isValidDomain("xn--example-abc123.com")).toBe(true);
    });

    it("should reject invalid formats", () => {
      expect(isValidDomain("")).toBe(false);
      expect(isValidDomain("   ")).toBe(false);
      expect(isValidDomain("example")).toBe(false); // No TLD
      expect(isValidDomain(".com")).toBe(false); // Leading dot
      expect(isValidDomain("example.")).toBe(false); // Trailing dot without TLD
      expect(isValidDomain("example..com")).toBe(false); // Double dot
    });

    it("should reject domains with invalid characters", () => {
      expect(isValidDomain("example.com/path")).toBe(false);
      expect(isValidDomain("example@domain.com")).toBe(false);
      expect(isValidDomain("example domain.com")).toBe(false);
      expect(isValidDomain("example_domain.com")).toBe(false);
    });

    it("should reject domains with hyphens in wrong positions", () => {
      expect(isValidDomain("-example.com")).toBe(false); // Leading hyphen
      expect(isValidDomain("example-.com")).toBe(false); // Trailing hyphen
      expect(isValidDomain("example.com-")).toBe(false); // TLD with trailing hyphen
      expect(isValidDomain("example.-com")).toBe(false); // TLD with leading hyphen
    });

    it("should handle case insensitivity", () => {
      expect(isValidDomain("EXAMPLE.COM")).toBe(true);
      expect(isValidDomain("Example.Com")).toBe(true);
    });

    it("should respect length limits", () => {
      // Domain too long (over 253 characters)
      const longDomain = `${"a".repeat(250)}.com`;
      expect(isValidDomain(longDomain)).toBe(false);

      // Label too long (over 63 characters)
      const longLabel = `${"a".repeat(64)}.com`;
      expect(isValidDomain(longLabel)).toBe(false);
    });

    it("should validate TLD length", () => {
      expect(isValidDomain("example.co")).toBe(true); // 2 char TLD
      expect(isValidDomain("example.museum")).toBe(true); // Long TLD
      expect(isValidDomain("example.c")).toBe(false); // Too short TLD
    });
  });
});
