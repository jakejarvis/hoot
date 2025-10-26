import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateVerificationToken,
  verifyDnsTxt,
  verifyFile,
  verifyMetaTag,
} from "./domain-verification";

// Mock DNS resolver
vi.mock("@/server/services/dns", () => ({
  resolveAll: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

const { resolveAll } = await import("@/server/services/dns");

describe("domain-verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateVerificationToken", () => {
    it("should generate a 32-character hex string", () => {
      const token = generateVerificationToken();
      expect(token).toHaveLength(32);
      expect(token).toMatch(/^[a-f0-9]{32}$/);
    });

    it("should generate unique tokens", () => {
      const token1 = generateVerificationToken();
      const token2 = generateVerificationToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe("verifyDnsTxt", () => {
    it("should verify successfully when TXT record matches", async () => {
      const domain = "example-dns-success.com";
      const token = "abc123def456";

      vi.mocked(resolveAll).mockResolvedValue({
        records: [
          {
            type: "TXT",
            value: `domainstack-verify=${token}`,
            name: "_domainstack.example-dns-success.com",
          },
        ],
        resolver: "cloudflare",
      });

      const result = await verifyDnsTxt(domain, token);

      expect(result).toEqual({
        verified: true,
        method: "dns",
      });
      expect(resolveAll).toHaveBeenCalledWith(domain);
    });

    it("should fail when TXT record has wrong token", async () => {
      const domain = "example-dns-wrong-token.com";
      const expectedToken = "abc123def456";

      vi.mocked(resolveAll).mockResolvedValue({
        records: [
          {
            type: "TXT",
            value: "domainstack-verify=wrongtoken",
            name: "_domainstack.example-dns-wrong-token.com",
          },
        ],
        resolver: "cloudflare",
      });

      const result = await verifyDnsTxt(domain, expectedToken);

      expect(result).toEqual({
        verified: false,
        method: "dns",
      });
    });

    it("should fail when no TXT records exist", async () => {
      const domain = "example-dns-no-txt.com";
      const token = "abc123def456";

      vi.mocked(resolveAll).mockResolvedValue({
        records: [
          {
            type: "A",
            value: "1.2.3.4",
            name: "example-dns-no-txt.com",
          },
        ],
        resolver: "cloudflare",
      });

      const result = await verifyDnsTxt(domain, token);

      expect(result).toEqual({
        verified: false,
        method: "dns",
      });
    });

    it("should fail gracefully on DNS error", async () => {
      const domain = "example-dns-error.com";
      const token = "abc123def456";

      vi.mocked(resolveAll).mockRejectedValue(
        new Error("DNS resolution failed"),
      );

      const result = await verifyDnsTxt(domain, token);

      expect(result).toEqual({
        verified: false,
        method: "dns",
      });
    });

    it("should verify when token is in one of multiple TXT records", async () => {
      const domain = "example-dns-multiple.com";
      const token = "abc123def456";

      vi.mocked(resolveAll).mockResolvedValue({
        records: [
          {
            type: "TXT",
            value: "v=spf1 include:_spf.google.com ~all",
            name: "example-dns-multiple.com",
          },
          {
            type: "TXT",
            value: `domainstack-verify=${token}`,
            name: "_domainstack.example-dns-multiple.com",
          },
          {
            type: "TXT",
            value: "some-other-txt-record",
            name: "example-dns-multiple.com",
          },
        ],
        resolver: "cloudflare",
      });

      const result = await verifyDnsTxt(domain, token);

      expect(result).toEqual({
        verified: true,
        method: "dns",
      });
    });
  });

  describe("verifyMetaTag", () => {
    it("should verify successfully when meta tag matches", async () => {
      const domain = "example-meta-success.com";
      const token = "xyz789abc123";

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="domainstack-verify" content="${token}">
            <title>Test Page</title>
          </head>
          <body>Hello</body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => html,
      } as Response);

      const result = await verifyMetaTag(domain, token);

      expect(result).toEqual({
        verified: true,
        method: "meta",
      });
      expect(fetch).toHaveBeenCalledWith(
        `https://${domain}/`,
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "User-Agent": expect.any(String),
          }),
        }),
      );
    });

    it("should fail when meta tag has wrong token", async () => {
      const domain = "example-meta-wrong.com";
      const expectedToken = "xyz789abc123";

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="domainstack-verify" content="wrongtoken">
          </head>
          <body>Hello</body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => html,
      } as Response);

      const result = await verifyMetaTag(domain, expectedToken);

      expect(result).toEqual({
        verified: false,
        method: "meta",
      });
    });

    it("should fail when meta tag is missing", async () => {
      const domain = "example-meta-missing.com";
      const token = "xyz789abc123";

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Page</title>
          </head>
          <body>Hello</body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => html,
      } as Response);

      const result = await verifyMetaTag(domain, token);

      expect(result).toEqual({
        verified: false,
        method: "meta",
      });
    });

    it("should fail when HTTP request fails", async () => {
      const domain = "example-meta-http-error.com";
      const token = "xyz789abc123";

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const result = await verifyMetaTag(domain, token);

      expect(result).toEqual({
        verified: false,
        method: "meta",
      });
    });

    it("should fail gracefully on network error", async () => {
      const domain = "example-meta-network-error.com";
      const token = "xyz789abc123";

      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

      const result = await verifyMetaTag(domain, token);

      expect(result).toEqual({
        verified: false,
        method: "meta",
      });
    });

    it("should trim whitespace from meta tag content", async () => {
      const domain = "example-meta-whitespace.com";
      const token = "xyz789abc123";

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="domainstack-verify" content="  ${token}  ">
          </head>
          <body>Hello</body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => html,
      } as Response);

      const result = await verifyMetaTag(domain, token);

      // Should succeed because the implementation trims whitespace
      expect(result).toEqual({
        verified: true,
        method: "meta",
      });
    });
  });

  describe("verifyFile", () => {
    it("should verify successfully when file content matches", async () => {
      const domain = "example-file-success.com";
      const token = "file123token456";

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => token,
      } as Response);

      const result = await verifyFile(domain, token);

      expect(result).toEqual({
        verified: true,
        method: "file",
      });
      expect(fetch).toHaveBeenCalledWith(
        `https://${domain}/.well-known/domainstack-verify.txt`,
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "User-Agent": expect.any(String),
          }),
        }),
      );
    });

    it("should fail when file content is wrong", async () => {
      const domain = "example-file-wrong.com";
      const expectedToken = "file123token456";

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => "wrongtoken",
      } as Response);

      const result = await verifyFile(domain, expectedToken);

      expect(result).toEqual({
        verified: false,
        method: "file",
      });
    });

    it("should fail when file is not found", async () => {
      const domain = "example-file-notfound.com";
      const token = "file123token456";

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const result = await verifyFile(domain, token);

      expect(result).toEqual({
        verified: false,
        method: "file",
      });
    });

    it("should fail gracefully on network error", async () => {
      const domain = "example-file-network-error.com";
      const token = "file123token456";

      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

      const result = await verifyFile(domain, token);

      expect(result).toEqual({
        verified: false,
        method: "file",
      });
    });

    it("should trim whitespace from file content", async () => {
      const domain = "example-file-whitespace.com";
      const token = "file123token456";

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => `  ${token}  \n`,
      } as Response);

      const result = await verifyFile(domain, token);

      expect(result).toEqual({
        verified: true,
        method: "file",
      });
    });

    it("should fail when file contains token with extra content", async () => {
      const domain = "example-file-extra.com";
      const token = "file123token456";

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => `${token}\nextra content here`,
      } as Response);

      const result = await verifyFile(domain, token);

      expect(result).toEqual({
        verified: false,
        method: "file",
      });
    });
  });
});
