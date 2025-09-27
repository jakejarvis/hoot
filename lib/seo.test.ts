import { describe, expect, it } from "vitest";
import {
  parseHtmlMeta,
  parseRobotsTxt,
  sanitizeText,
  selectPreview,
} from "./seo";

describe("sanitizeText", () => {
  it("trims, collapses whitespace, and removes control chars", () => {
    expect(sanitizeText("  A\tB\nC  ")).toBe("A B C");
    // includes a DEL char 127
    expect(sanitizeText("A\x7FB")).toBe("AB");
  });
});

describe("parseHtmlMeta + selectPreview", () => {
  it("extracts OG/Twitter/general and resolves preview fallbacks", () => {
    const html = `
      <html><head>
        <title>Site Title</title>
        <meta name="description" content="General description" />
        <meta property="og:title" content="OG Title" />
        <meta property="og:description" content="OG Description" />
        <meta property="og:image" content="/og.png" />
        <meta name="twitter:title" content="TW Title" />
        <meta name="twitter:description" content="TW Description" />
        <meta name="twitter:image" content="/tw.png" />
        <link rel="canonical" href="/home" />
      </head><body></body></html>
    `;
    const meta = parseHtmlMeta(html, "https://example.com/");
    const preview = selectPreview(meta, "https://example.com/");
    expect(preview.title).toBe("OG Title");
    expect(preview.description).toBe("OG Description");
    expect(preview.image).toBe("https://example.com/og.png");
    expect(preview.canonicalUrl).toBe("https://example.com/home");
  });

  it("falls back to twitter then general when OG missing", () => {
    const html = `
      <html><head>
        <title>Base Title</title>
        <meta name="twitter:title" content="TW Title" />
        <meta name="twitter:description" content="TW Description" />
      </head></html>
    `;
    const meta = parseHtmlMeta(html, "https://e.com/");
    const p = selectPreview(meta, "https://e.com/");
    expect(p.title).toBe("TW Title");
    expect(p.description).toBe("TW Description");
    expect(p.image).toBeNull();
    expect(p.canonicalUrl).toBe("https://e.com/");
  });
});

describe("parseRobotsTxt", () => {
  it("parses groups and sitemaps", () => {
    const txt = `
User-agent: *
Disallow: /admin
Allow: /
Sitemap: https://example.com/sitemap.xml
`;
    const r = parseRobotsTxt(txt);
    expect(r.fetched).toBe(true);
    expect(r.groups.length).toBe(1);
    expect(r.groups[0]?.userAgents[0]).toBe("*");
    expect(r.sitemaps[0]).toContain("sitemap.xml");
  });
});
