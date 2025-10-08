import { describe, expect, it } from "vitest";
import {
  parseHtmlMeta,
  parseRobotsTxt,
  resolveUrlMaybe,
  sanitizeText,
  selectPreview,
} from "./seo";

describe("seo html/meta parsing", () => {
  it("parses and normalizes general, og, and twitter tags", () => {
    const html = `<!doctype html>
    <html><head>
      <title>  My Site  </title>
      <meta name="description" content="  desc  ">
      <link rel="canonical" href="/about">
      <meta name="robots" content=" index,  follow ">

      <meta property="og:title" content="OG Title" />
      <meta property="og:description" content="OG Desc" />
      <meta property="og:url" content="/about" />
      <meta property="og:site_name" content="Site" />
      <meta property="og:image" content="/img.png" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="TW Title" />
      <meta name="twitter:description" content="TW Desc" />
      <meta name="twitter:image" content="/tw.jpg" />
    </head><body></body></html>`;

    const meta = parseHtmlMeta(html, "https://example.com/page");
    expect(meta.general.title).toBe("My Site");
    expect(meta.general.description).toBe("desc");
    expect(meta.general.canonical).toBe("https://example.com/about");
    expect(meta.general.robots).toBe("index, follow");

    expect(meta.openGraph.title).toBe("OG Title");
    expect(meta.openGraph.description).toBe("OG Desc");
    expect(meta.openGraph.url).toBe("https://example.com/about");
    expect(meta.openGraph.siteName).toBe("Site");
    expect(meta.openGraph.images[0]).toBe("https://example.com/img.png");

    expect(meta.twitter.card).toBe("summary_large_image");
    expect(meta.twitter.title).toBe("TW Title");
    expect(meta.twitter.description).toBe("TW Desc");
    expect(meta.twitter.image).toBe("https://example.com/tw.jpg");

    const preview = selectPreview(meta, "https://fallback.test/");
    expect(preview.title).toBe("OG Title");
    expect(preview.description).toBe("OG Desc");
    expect(preview.image).toBe("https://example.com/img.png");
    expect(preview.canonicalUrl).toBe("https://example.com/about");
  });

  it("falls back in selectPreview and baseUrl when fields are missing", () => {
    const html = `<!doctype html><html><head>
      <title>Title Only</title>
      <meta name="description" content="General" />
    </head></html>`;
    const meta = parseHtmlMeta(html, "https://ex.org/");
    const preview = selectPreview(meta, "https://ex.org/");
    expect(preview.title).toBe("Title Only");
    expect(preview.description).toBe("General");
    expect(preview.image).toBeNull();
    expect(preview.canonicalUrl).toBe("https://ex.org/");
  });
});

describe("seo helpers", () => {
  it("sanitizeText removes control characters and collapses whitespace", () => {
    const weird = "a\u0007\u000b  b\n\t c";
    expect(sanitizeText(weird)).toBe("a b c");
  });

  it("resolveUrlMaybe returns absolute URLs and null for invalid schemes", () => {
    expect(resolveUrlMaybe("/rel", "https://e.com/base")).toBe(
      "https://e.com/rel",
    );
    expect(resolveUrlMaybe("https://x.com/a", "https://e.com")).toBe(
      "https://x.com/a",
    );
    expect(resolveUrlMaybe("mailto:hi@e.com", "https://e.com")).toBeNull();
    expect(resolveUrlMaybe(undefined, "https://e.com")).toBeNull();
  });
});

describe("robots.txt parsing", () => {
  it("parses groups, rules and sitemaps with comments and case-insensitive keys", () => {
    const text = [
      "User-Agent: *",
      "Allow: /",
      "Disallow: /admin",
      "Crawl-Delay: 10",
      "Sitemap: https://example.com/sitemap.xml",
      "# comment",
      "User-agent: Googlebot",
      "Disallow: /private",
    ].join("\n");

    const robots = parseRobotsTxt(text);
    expect(robots.fetched).toBe(true);
    expect(robots.sitemaps[0]).toBe("https://example.com/sitemap.xml");
    expect(robots.groups.length).toBe(2);
    const any = robots.groups[0];
    expect(any.userAgents).toContain("*");
    expect(any.rules.find((r) => r.type === "allow")?.value).toBe("/");
    expect(any.rules.find((r) => r.type === "disallow")?.value).toBe("/admin");
    expect(any.rules.find((r) => r.type === "crawlDelay")?.value).toBe("10");

    const google = robots.groups[1];
    expect(google.userAgents).toContain("Googlebot");
    expect(google.rules[0]).toEqual({ type: "disallow", value: "/private" });
  });

  it("handles blank line and comments after User-agent and parses vercel-style sample", () => {
    const text = [
      "User-Agent: *",
      "",
      "# Allow robots to be able to crawl the OG Image API route and all the subpaths",
      "Allow: /api/og/*",
      "Allow: /api/product-og*",
      "Allow: /api/templates/og*",
      "Allow: /api/dynamic-og*",
      "Allow: /api/www/avatar/*",
      "",
      "Disallow:",
      "Disallow: /api/",
      "Disallow: /oauth",
      "",
      "Sitemap: https://vercel.com/sitemap.xml",
    ].join("\n");

    const robots = parseRobotsTxt(text);
    expect(robots.fetched).toBe(true);
    expect(robots.sitemaps).toContain("https://vercel.com/sitemap.xml");
    expect(robots.groups.length).toBe(1);
    const any = robots.groups[0];
    expect(any.userAgents).toEqual(["*"]);
    // empty Disallow captured as a rule with empty value
    expect(any.rules.some((r) => r.type === "disallow" && r.value === "")).toBe(
      true,
    );
    // a few representative rules parsed
    expect(
      any.rules.some((r) => r.type === "allow" && r.value === "/api/og/*"),
    ).toBe(true);
    expect(
      any.rules.some((r) => r.type === "disallow" && r.value === "/api/"),
    ).toBe(true);
  });

  it("captures empty Disallow explicitly and non-empty alongside it", () => {
    const text = [
      "User-agent: *",
      "Disallow:",
      "Disallow: /admin",
      "Allow: /",
    ].join("\n");
    const robots = parseRobotsTxt(text);
    const g = robots.groups[0];
    const empty = g.rules.find((r) => r.type === "disallow" && r.value === "");
    expect(empty).toBeTruthy();
    expect(
      g.rules.some((r) => r.type === "disallow" && r.value === "/admin"),
    ).toBe(true);
  });

  it("tolerates BOM at the start of file before first directive", () => {
    const text = ["\uFEFFUser-agent: *", "Disallow: /private"].join("\n");
    const robots = parseRobotsTxt(text);
    expect(robots.groups.length).toBe(1);
    const g = robots.groups[0];
    expect(g.userAgents).toEqual(["*"]);
    expect(g.rules[0]).toEqual({ type: "disallow", value: "/private" });
  });
});
