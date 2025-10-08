import * as cheerio from "cheerio";
import type {
  GeneralMeta,
  OpenGraphMeta,
  RobotsGroup,
  RobotsRule,
  RobotsTxt,
  SeoMeta,
  SeoPreview,
  TwitterMeta,
} from "@/lib/schemas";

export function sanitizeText(input: unknown): string {
  let out = String(input ?? "");
  out = out.trim().replace(/\s+/g, " ");
  let res = "";
  for (let i = 0; i < out.length; i++) {
    const code = out.charCodeAt(i);
    if (
      (code >= 0 && code <= 8) ||
      (code >= 11 && code <= 12) ||
      (code >= 14 && code <= 31) ||
      code === 127
    ) {
      continue;
    }
    res += out[i] as string;
  }
  // Strip invisible formatting chars (ZWSP, bidi marks, BOM)
  return res.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "");
}

export function resolveUrlMaybe(
  value: string | undefined,
  baseUrl: string,
): string | null {
  if (!value) return null;
  try {
    const u = new URL(value, baseUrl);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    return null;
  } catch {
    return null;
  }
}

export function parseHtmlMeta(html: string, finalUrl: string): SeoMeta {
  const $ = cheerio.load(html);

  const titleTag = sanitizeText($("title").first().text());
  const descriptionTag = sanitizeText(
    $('meta[name="description"]').attr("content") ?? "",
  );
  const canonicalHref = $('link[rel="canonical"]').attr("href") ?? "";
  const robotsMeta = $('meta[name="robots"]').attr("content") ?? "";

  const og: OpenGraphMeta = {
    title: pickMetaAttr($, "property", "og:title"),
    description: pickMetaAttr($, "property", "og:description"),
    type: pickMetaAttr($, "property", "og:type"),
    url: pickMetaAttr($, "property", "og:url"),
    siteName: pickMetaAttr($, "property", "og:site_name"),
    images: Array.from(
      new Set([
        ...collectMetaMulti($, "property", "og:image"),
        ...collectMetaMulti($, "property", "og:image:url"),
        ...collectMetaMulti($, "property", "og:image:secure_url"),
      ]),
    ),
  };

  const tw: TwitterMeta = {
    card: pickMetaAttr($, "name", "twitter:card"),
    title: pickMetaAttr($, "name", "twitter:title"),
    description: pickMetaAttr($, "name", "twitter:description"),
    image:
      pickMetaAttr($, "name", "twitter:image") ??
      pickMetaAttr($, "name", "twitter:image:src"),
  };

  const general: GeneralMeta = {
    title: titleTag || undefined,
    description: descriptionTag || undefined,
    canonical: sanitizeText(canonicalHref) || undefined,
    robots: sanitizeText(robotsMeta) || undefined,
  };

  general.canonical =
    resolveUrlMaybe(general.canonical, finalUrl) ?? general.canonical;
  og.url = resolveUrlMaybe(og.url, finalUrl) ?? og.url;
  og.images = og.images
    .map((i) => resolveUrlMaybe(i, finalUrl))
    .filter(Boolean) as string[];
  if (tw.image) tw.image = resolveUrlMaybe(tw.image, finalUrl) ?? tw.image;

  return {
    openGraph: og,
    twitter: tw,
    general,
  };
}

function pickMetaAttr(
  $: cheerio.CheerioAPI,
  attr: "name" | "property",
  key: string,
): string | undefined {
  const value = $(`meta[${attr}="${key}"]`).attr("content") ?? "";
  const s = sanitizeText(value);
  return s === "" ? undefined : s;
}

function collectMetaMulti(
  $: cheerio.CheerioAPI,
  attr: "name" | "property",
  key: string,
): string[] {
  const out: string[] = [];
  $(`meta[${attr}="${key}"]`).each((_i, el) => {
    const v = sanitizeText($(el).attr("content") ?? "");
    if (v) out.push(v);
  });
  return out;
}

export function selectPreview(
  meta: SeoMeta | null,
  finalUrl: string,
): SeoPreview {
  const title =
    meta?.openGraph.title || meta?.twitter.title || meta?.general.title || null;
  const description =
    meta?.openGraph.description ||
    meta?.twitter.description ||
    meta?.general.description ||
    null;
  const image = meta?.openGraph.images?.[0] || meta?.twitter.image || null;
  const canonicalUrl =
    meta?.general.canonical || meta?.openGraph.url || finalUrl;
  return { title, description, image, imageUploaded: null, canonicalUrl };
}

export function parseRobotsTxt(text: string): RobotsTxt {
  const lines = text.split(/\r?\n/);
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];

  let currentAgents: string[] = [];
  let currentRules: RobotsRule[] = [];

  function flushGroup() {
    if (currentAgents.length > 0) {
      groups.push({
        userAgents: currentAgents.slice(),
        rules: currentRules.slice(),
      });
      currentAgents = [];
      currentRules = [];
    }
  }

  for (const rawLine of lines) {
    // Remove invisible Unicode control chars (including BOM) before parsing
    const cleaned = rawLine.replace(
      /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g,
      "",
    );
    const line = cleaned.split("#")[0]?.trim() ?? "";
    if (line === "") {
      // Treat blank lines as whitespace; do not flush the current group
      continue;
    }
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = sanitizeText(line.slice(idx + 1));

    if (key === "user-agent") {
      // Start a new group if we already collected rules; consecutive UA lines share the same group
      if (currentAgents.length > 0 && currentRules.length > 0) flushGroup();
      if (value) currentAgents.push(value);
      continue;
    }
    if (key === "allow") {
      if (currentAgents.length > 0) currentRules.push({ type: "allow", value });
      continue;
    }
    if (key === "disallow") {
      if (currentAgents.length > 0)
        currentRules.push({ type: "disallow", value });
      continue;
    }
    if (key === "crawl-delay") {
      if (currentAgents.length > 0)
        currentRules.push({ type: "crawlDelay", value });
      continue;
    }
    if (key === "sitemap") {
      if (value) sitemaps.push(value);
    }
  }
  flushGroup();

  return { fetched: true, groups, sitemaps };
}
