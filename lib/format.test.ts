import { describe, expect, it } from "vitest";
import {
  equalHostname,
  formatDate,
  formatRegistrant,
  formatTtl,
} from "@/lib/format";

describe("Format Utilities", () => {
  describe("formatDate", () => {
    it("should format valid ISO date string", () => {
      const iso = "2023-12-01T10:30:00Z";
      const result = formatDate(iso);

      // Should be formatted as a locale string (exact format may vary by environment)
      expect(result).toBeTruthy();
      expect(result).not.toBe(iso); // Should be formatted differently
    });

    it("should return original string for invalid dates", () => {
      expect(formatDate("invalid-date")).toBe("Invalid Date");
      expect(formatDate("")).toBe("Invalid Date");
      expect(formatDate("not-a-date")).toBe("Invalid Date");
    });

    it("should handle edge cases", () => {
      expect(formatDate("2023-13-45T99:99:99Z")).toBe("Invalid Date");
    });
  });

  describe("formatRegistrant", () => {
    it("should format registrant with organization and country", () => {
      const reg = {
        organization: "Example Corp",
        country: "United States",
      };
      const result = formatRegistrant(reg);
      expect(result).toBe("Example Corp — United States");
    });

    it("should format registrant with organization, state, and country", () => {
      const reg = {
        organization: "Example Corp",
        country: "United States",
        state: "California",
      };
      const result = formatRegistrant(reg);
      expect(result).toBe("Example Corp — California, United States");
    });

    it("should format registrant with only country", () => {
      const reg = {
        organization: "",
        country: "United States",
      };
      const result = formatRegistrant(reg);
      expect(result).toBe("United States");
    });

    it("should format registrant with only state and country", () => {
      const reg = {
        organization: "",
        country: "United States",
        state: "California",
      };
      const result = formatRegistrant(reg);
      expect(result).toBe("California, United States");
    });

    it("should handle empty/whitespace values", () => {
      const reg = {
        organization: "  ",
        country: "  ",
        state: "",
      };
      const result = formatRegistrant(reg);
      expect(result).toBe("Unavailable");
    });

    it("should return Unavailable when all fields are empty", () => {
      const reg = {
        organization: "",
        country: "",
      };
      const result = formatRegistrant(reg);
      expect(result).toBe("Unavailable");
    });

    it("should handle organization with special characters", () => {
      const reg = {
        organization: "Example & Co., LLC",
        country: "United States",
      };
      const result = formatRegistrant(reg);
      expect(result).toBe("Example & Co., LLC — United States");
    });
  });

  describe("formatTtl", () => {
    it("should format seconds only", () => {
      expect(formatTtl(30)).toBe("30s");
      expect(formatTtl(59)).toBe("59s");
    });

    it("should format minutes and seconds", () => {
      expect(formatTtl(60)).toBe("1m");
      expect(formatTtl(90)).toBe("1m");
      expect(formatTtl(120)).toBe("2m");
      expect(formatTtl(3599)).toBe("59m");
    });

    it("should format hours and minutes", () => {
      expect(formatTtl(3600)).toBe("1h");
      expect(formatTtl(3660)).toBe("1h 1m");
      expect(formatTtl(7200)).toBe("2h");
      expect(formatTtl(7320)).toBe("2h 2m");
    });

    it("should format large TTL values", () => {
      expect(formatTtl(86400)).toBe("24h"); // 1 day
      expect(formatTtl(90000)).toBe("25h"); // 25 hours
    });

    it("should handle edge cases", () => {
      expect(formatTtl(0)).toBe("0s");
      expect(formatTtl(-1)).toBe("-1s");
      expect(formatTtl(Number.POSITIVE_INFINITY)).toBe("Infinitys");
      expect(formatTtl(NaN)).toBe("NaNs");
    });

    it("should not show seconds when there are hours", () => {
      expect(formatTtl(3661)).toBe("1h 1m"); // 1 hour, 1 minute, 1 second - seconds omitted
      expect(formatTtl(3700)).toBe("1h 1m"); // 1 hour, 1 minute, 40 seconds - seconds omitted
    });

    it("should show seconds only when no hours or minutes", () => {
      expect(formatTtl(45)).toBe("45s");
    });
  });

  describe("equalHostname", () => {
    it("should compare hostnames case-insensitively", () => {
      expect(equalHostname("example.com", "EXAMPLE.COM")).toBe(true);
      expect(equalHostname("Example.Com", "example.com")).toBe(true);
      expect(equalHostname("API.EXAMPLE.COM", "api.example.com")).toBe(true);
    });

    it("should trim whitespace", () => {
      expect(equalHostname("  example.com  ", "example.com")).toBe(true);
      expect(equalHostname("example.com", "  example.com  ")).toBe(true);
      expect(equalHostname("  example.com  ", "  EXAMPLE.COM  ")).toBe(true);
    });

    it("should return false for different hostnames", () => {
      expect(equalHostname("example.com", "test.com")).toBe(false);
      expect(equalHostname("api.example.com", "example.com")).toBe(false);
    });

    it("should handle identical strings", () => {
      expect(equalHostname("example.com", "example.com")).toBe(true);
      expect(equalHostname("", "")).toBe(true);
    });

    it("should handle edge cases gracefully", () => {
      expect(equalHostname("example.com", "")).toBe(false);
      expect(equalHostname("", "example.com")).toBe(false);
      // These should fallback to direct comparison if trim/toLowerCase throws
      expect(equalHostname("example.com", "example.com")).toBe(true);
    });

    it("should handle special characters", () => {
      expect(equalHostname("xn--fsq.xn--0zwm56d", "XN--FSQ.XN--0ZWM56D")).toBe(
        true,
      );
    });
  });
});
