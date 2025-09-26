import * as cheerio from "cheerio";
import { captureServer } from "@/lib/analytics/server";
import { getOrSet, ns } from "@/lib/redis";

export interface SeoMeta {
  openGraph: {
    title?: string;
    description?: string;
    type?: string;
    url?: string;
    siteName?: string;
    images: string[];
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
  };
  general: {
    title?: string;
    description?: string;
    canonical?: string;
    robots?: string;
  };
}

export interface RobotsGroup {
  userAgents: string[];
  rules: Array<{
    type: "allow" | "disallow" | "crawlDelay";
    value: string;
  }>;
}

export interface RobotsData {
  fetched: boolean;
  groups: RobotsGroup[];
  sitemaps: string[];
}

export interface SeoPreview {
  title?: string;
  description?: string;
  image?: string;
  canonicalUrl?: string;
}

export interface SeoData {
  meta: SeoMeta;
  robots: RobotsData;
  preview: SeoPreview;
  timestamps: {
    fetchedAt: string;
  };
  source: {
    finalUrl: string;
    status: number;
  };
  errors?: {
    html?: string;
    robots?: string;
  };
}

const MAX_HTML_SIZE = 512 * 1024; // 512KB limit
const FETCH_TIMEOUT = 10000; // 10 second timeout

export async function fetchSeoData(domain: string): Promise<SeoData> {
  const lower = domain.toLowerCase();
  const htmlKey = ns("seo:html:v1", lower);
  const robotsKey = ns("seo:robots:v1", lower);

  // Parallel cache lookup and fetch
  const [htmlResult, robotsResult] = await Promise.allSettled([
    getOrSet(htmlKey, 6 * 60 * 60, () => fetchAndParseHtml(domain)), // 6 hours
    getOrSet(robotsKey, 12 * 60 * 60, () => fetchAndParseRobots(domain)), // 12 hours
  ]);

  const errors: { html?: string; robots?: string } = {};
  let meta: SeoMeta = {
    openGraph: { images: [] },
    twitter: {},
    general: {},
  };
  let source = { finalUrl: `https://${domain}`, status: 0 };
  
  let robots: RobotsData = {
    fetched: false,
    groups: [],
    sitemaps: [],
  };

  // Handle HTML result
  if (htmlResult.status === "fulfilled") {
    meta = htmlResult.value.meta;
    source = htmlResult.value.source;
  } else {
    errors.html = htmlResult.reason?.message || "Failed to fetch HTML";
  }

  // Handle robots result
  if (robotsResult.status === "fulfilled") {
    robots = robotsResult.value;
  } else {
    errors.robots = robotsResult.reason?.message || "Failed to fetch robots.txt";
  }

  // Generate preview with fallback logic
  const preview = selectPreview(meta, source.finalUrl);

  return {
    meta,
    robots,
    preview,
    timestamps: {
      fetchedAt: new Date().toISOString(),
    },
    source,
    ...(Object.keys(errors).length > 0 && { errors }),
  };
}

async function fetchAndParseHtml(domain: string): Promise<{
  meta: SeoMeta;
  source: { finalUrl: string; status: number };
}> {
  const url = `https://${domain}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en",
        "User-Agent": "Hoot/1.0 (+https://hoot.sh)",
      },
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      throw new Error(`Non-HTML response: ${contentType}`);
    }

    // Read with size limit
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      totalSize += value.length;
      if (totalSize > MAX_HTML_SIZE) {
        reader.releaseLock();
        throw new Error(`HTML too large: ${totalSize} bytes`);
      }
      
      chunks.push(value);
    }

    // Concatenate all chunks properly
    const combinedArray = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      combinedArray.set(chunk, offset);
      offset += chunk.length;
    }

    const html = new TextDecoder().decode(combinedArray);

    await captureServer("seo_html_fetch", {
      domain: domain.toLowerCase(),
      status: response.status,
      final_url: response.url,
      content_length: html.length,
    });

    const meta = parseMeta(html);
    
    return {
      meta,
      source: {
        finalUrl: response.url,
        status: response.status,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    
    await captureServer("seo_html_fetch", {
      domain: domain.toLowerCase(),
      status: -1,
      final_url: url,
      error: String(error),
    });

    throw new Error(`HTML fetch failed: ${error}`);
  }
}

async function fetchAndParseRobots(domain: string): Promise<RobotsData> {
  const url = `https://${domain}/robots.txt`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Hoot/1.0 (+https://hoot.sh)",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/plain") && !contentType.includes("text/")) {
      throw new Error(`Non-text response: ${contentType}`);
    }

    const text = await response.text();

    await captureServer("seo_robots_fetch", {
      domain: domain.toLowerCase(),
      status: response.status,
      content_length: text.length,
    });

    return parseRobots(text);
  } catch (error) {
    clearTimeout(timeoutId);

    await captureServer("seo_robots_fetch", {
      domain: domain.toLowerCase(),
      status: -1,
      error: String(error),
    });

    throw new Error(`Robots fetch failed: ${error}`);
  }
}

export function parseMeta(html: string): SeoMeta {
  const $ = cheerio.load(html);
  
  const meta: SeoMeta = {
    openGraph: {
      images: [],
    },
    twitter: {},
    general: {},
  };

  // General meta tags
  meta.general.title = $("title").first().text().trim() || undefined;
  meta.general.description = $('meta[name="description"]').attr("content")?.trim() || undefined;
  meta.general.canonical = $('link[rel="canonical"]').attr("href")?.trim() || undefined;
  meta.general.robots = $('meta[name="robots"]').attr("content")?.trim() || undefined;

  // Open Graph tags
  $('meta[property^="og:"]').each((_, elem) => {
    const property = $(elem).attr("property");
    const content = $(elem).attr("content")?.trim();
    
    if (!property || !content) return;

    const key = property.replace("og:", "");
    switch (key) {
      case "title":
        meta.openGraph.title = content;
        break;
      case "description":
        meta.openGraph.description = content;
        break;
      case "type":
        meta.openGraph.type = content;
        break;
      case "url":
        meta.openGraph.url = content;
        break;
      case "site_name":
        meta.openGraph.siteName = content;
        break;
      case "image":
        meta.openGraph.images.push(content);
        break;
    }
  });

  // Twitter Card tags
  $('meta[name^="twitter:"]').each((_, elem) => {
    const name = $(elem).attr("name");
    const content = $(elem).attr("content")?.trim();
    
    if (!name || !content) return;

    const key = name.replace("twitter:", "");
    switch (key) {
      case "card":
        meta.twitter.card = content;
        break;
      case "title":
        meta.twitter.title = content;
        break;
      case "description":
        meta.twitter.description = content;
        break;
      case "image":
        meta.twitter.image = content;
        break;
    }
  });

  return meta;
}

export function parseRobots(text: string): RobotsData {
  const lines = text.split(/\r?\n/);
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  
  let currentGroup: RobotsGroup | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const directive = trimmed.slice(0, colonIndex).trim().toLowerCase();
    const value = trimmed.slice(colonIndex + 1).trim();

    if (!value) continue;

    switch (directive) {
      case "user-agent":
        // Start a new group
        currentGroup = {
          userAgents: [value],
          rules: [],
        };
        groups.push(currentGroup);
        break;
        
      case "allow":
        if (currentGroup) {
          currentGroup.rules.push({ type: "allow", value });
        }
        break;
        
      case "disallow":
        if (currentGroup) {
          currentGroup.rules.push({ type: "disallow", value });
        }
        break;
        
      case "crawl-delay":
        if (currentGroup) {
          currentGroup.rules.push({ type: "crawlDelay", value });
        }
        break;
        
      case "sitemap":
        sitemaps.push(value);
        break;
    }
  }

  return {
    fetched: true,
    groups,
    sitemaps,
  };
}

export function selectPreview(meta: SeoMeta, finalUrl: string): SeoPreview {
  // Title priority: og:title -> twitter:title -> <title>
  const title = meta.openGraph.title || meta.twitter.title || meta.general.title;

  // Description priority: og:description -> twitter:description -> meta[name=description]
  const description = meta.openGraph.description || meta.twitter.description || meta.general.description;

  // Image priority: first og:image -> twitter:image
  const image = meta.openGraph.images[0] || meta.twitter.image;

  // Canonical URL priority: rel=canonical -> og:url -> final fetched URL
  const canonicalUrl = meta.general.canonical || meta.openGraph.url || finalUrl;

  return {
    title,
    description,
    image,
    canonicalUrl,
  };
}