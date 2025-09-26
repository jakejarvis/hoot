import { describe, expect, it, vi } from "vitest";
import { parseMeta, parseRobots, selectPreview, type SeoMeta } from "./seo";

describe("parseMeta", () => {
  it("extracts basic meta tags", () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Title</title>
          <meta name="description" content="Test description">
          <link rel="canonical" href="https://example.com/canonical">
          <meta name="robots" content="index, follow">
        </head>
        <body></body>
      </html>
    `;

    const result = parseMeta(html);

    expect(result.general.title).toBe("Test Title");
    expect(result.general.description).toBe("Test description");
    expect(result.general.canonical).toBe("https://example.com/canonical");
    expect(result.general.robots).toBe("index, follow");
  });

  it("extracts Open Graph tags", () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="og:title" content="OG Title">
          <meta property="og:description" content="OG Description">
          <meta property="og:type" content="website">
          <meta property="og:url" content="https://example.com/og">
          <meta property="og:site_name" content="Example Site">
          <meta property="og:image" content="https://example.com/image1.jpg">
          <meta property="og:image" content="https://example.com/image2.jpg">
        </head>
        <body></body>
      </html>
    `;

    const result = parseMeta(html);

    expect(result.openGraph.title).toBe("OG Title");
    expect(result.openGraph.description).toBe("OG Description");
    expect(result.openGraph.type).toBe("website");
    expect(result.openGraph.url).toBe("https://example.com/og");
    expect(result.openGraph.siteName).toBe("Example Site");
    expect(result.openGraph.images).toEqual([
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg",
    ]);
  });

  it("extracts Twitter Card tags", () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="Twitter Title">
          <meta name="twitter:description" content="Twitter Description">
          <meta name="twitter:image" content="https://example.com/twitter.jpg">
        </head>
        <body></body>
      </html>
    `;

    const result = parseMeta(html);

    expect(result.twitter.card).toBe("summary_large_image");
    expect(result.twitter.title).toBe("Twitter Title");
    expect(result.twitter.description).toBe("Twitter Description");
    expect(result.twitter.image).toBe("https://example.com/twitter.jpg");
  });

  it("handles empty and malformed HTML", () => {
    const result = parseMeta("<html></html>");

    expect(result.general.title).toBeUndefined();
    expect(result.general.description).toBeUndefined();
    expect(result.openGraph.images).toEqual([]);
  });

  it("trims whitespace from content", () => {
    const html = `
      <html>
        <head>
          <title>  Spaced Title  </title>
          <meta name="description" content="  Spaced Description  ">
          <meta property="og:title" content="  Spaced OG  ">
        </head>
      </html>
    `;

    const result = parseMeta(html);

    expect(result.general.title).toBe("Spaced Title");
    expect(result.general.description).toBe("Spaced Description");
    expect(result.openGraph.title).toBe("Spaced OG");
  });
});

describe("parseRobots", () => {
  it("parses basic robots.txt structure", () => {
    const robotsText = `
# This is a comment
User-agent: *
Disallow: /private/
Allow: /public/
Crawl-delay: 1

User-agent: Googlebot
Disallow: /admin/
Allow: /

Sitemap: https://example.com/sitemap.xml
Sitemap: https://example.com/news-sitemap.xml
    `;

    const result = parseRobots(robotsText);

    expect(result.fetched).toBe(true);
    expect(result.groups).toHaveLength(2);
    
    // First group
    expect(result.groups[0].userAgents).toEqual(["*"]);
    expect(result.groups[0].rules).toEqual([
      { type: "disallow", value: "/private/" },
      { type: "allow", value: "/public/" },
      { type: "crawlDelay", value: "1" },
    ]);

    // Second group
    expect(result.groups[1].userAgents).toEqual(["Googlebot"]);
    expect(result.groups[1].rules).toEqual([
      { type: "disallow", value: "/admin/" },
      { type: "allow", value: "/" },
    ]);

    // Sitemaps
    expect(result.sitemaps).toEqual([
      "https://example.com/sitemap.xml",
      "https://example.com/news-sitemap.xml",
    ]);
  });

  it("handles malformed and edge cases", () => {
    const robotsText = `
# Comment only line
User-agent:
Disallow:
Invalid line without colon
User-agent: Bot1
Disallow: /test/

# Empty lines should be ignored

User-agent: Bot2
    `;

    const result = parseRobots(robotsText);

    expect(result.fetched).toBe(true);
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0].userAgents).toEqual(["Bot1"]);
    expect(result.groups[1].userAgents).toEqual(["Bot2"]);
    expect(result.groups[1].rules).toEqual([]);
  });

  it("handles empty robots.txt", () => {
    const result = parseRobots("");

    expect(result.fetched).toBe(true);
    expect(result.groups).toEqual([]);
    expect(result.sitemaps).toEqual([]);
  });
});

describe("selectPreview", () => {
  it("prioritizes title correctly", () => {
    const meta: SeoMeta = {
      openGraph: {
        title: "OG Title",
        images: [],
      },
      twitter: {
        title: "Twitter Title",
      },
      general: {
        title: "General Title",
      },
    };

    const result = selectPreview(meta, "https://example.com");
    expect(result.title).toBe("OG Title");
  });

  it("falls back to Twitter title when OG missing", () => {
    const meta: SeoMeta = {
      openGraph: {
        images: [],
      },
      twitter: {
        title: "Twitter Title",
      },
      general: {
        title: "General Title",
      },
    };

    const result = selectPreview(meta, "https://example.com");
    expect(result.title).toBe("Twitter Title");
  });

  it("falls back to general title when others missing", () => {
    const meta: SeoMeta = {
      openGraph: {
        images: [],
      },
      twitter: {},
      general: {
        title: "General Title",
      },
    };

    const result = selectPreview(meta, "https://example.com");
    expect(result.title).toBe("General Title");
  });

  it("prioritizes description correctly", () => {
    const meta: SeoMeta = {
      openGraph: {
        description: "OG Description",
        images: [],
      },
      twitter: {
        description: "Twitter Description",
      },
      general: {
        description: "General Description",
      },
    };

    const result = selectPreview(meta, "https://example.com");
    expect(result.description).toBe("OG Description");
  });

  it("prioritizes image correctly", () => {
    const meta: SeoMeta = {
      openGraph: {
        images: ["https://example.com/og.jpg"],
      },
      twitter: {
        image: "https://example.com/twitter.jpg",
      },
      general: {},
    };

    const result = selectPreview(meta, "https://example.com");
    expect(result.image).toBe("https://example.com/og.jpg");
  });

  it("falls back to Twitter image when no OG image", () => {
    const meta: SeoMeta = {
      openGraph: {
        images: [],
      },
      twitter: {
        image: "https://example.com/twitter.jpg",
      },
      general: {},
    };

    const result = selectPreview(meta, "https://example.com");
    expect(result.image).toBe("https://example.com/twitter.jpg");
  });

  it("prioritizes canonical URL correctly", () => {
    const meta: SeoMeta = {
      openGraph: {
        url: "https://example.com/og",
        images: [],
      },
      twitter: {},
      general: {
        canonical: "https://example.com/canonical",
      },
    };

    const result = selectPreview(meta, "https://example.com/final");
    expect(result.canonicalUrl).toBe("https://example.com/canonical");
  });

  it("falls back to final URL when no canonical", () => {
    const meta: SeoMeta = {
      openGraph: {
        images: [],
      },
      twitter: {},
      general: {},
    };

    const result = selectPreview(meta, "https://example.com/final");
    expect(result.canonicalUrl).toBe("https://example.com/final");
  });

  it("returns undefined for missing values", () => {
    const meta: SeoMeta = {
      openGraph: {
        images: [],
      },
      twitter: {},
      general: {},
    };

    const result = selectPreview(meta, "https://example.com");
    expect(result.title).toBeUndefined();
    expect(result.description).toBeUndefined();
    expect(result.image).toBeUndefined();
  });
});