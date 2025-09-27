import { captureServer } from "@/lib/analytics/server";
import { cacheGet, cacheSet } from "@/lib/redis";
import { parseHtmlMeta, parseRobotsTxt, selectPreview } from "@/lib/seo";
import { USER_AGENT } from "./constants";

type SeoResponse = {
  meta: ReturnType<typeof parseHtmlMeta> | null;
  robots: ReturnType<typeof parseRobotsTxt> | null;
  preview: ReturnType<typeof selectPreview> | null;
  timestamps: { fetchedAt: string };
  source: { finalUrl: string | null; status: number | null };
  errors?: { html?: string; robots?: string };
};

function hashDomain(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    hash = (hash << 5) - hash + code;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

async function fetchWithTimeout(
  url: string,
  opts: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10000);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function getSeo(domain: string): Promise<SeoResponse> {
  const lower = domain.toLowerCase();
  const h = hashDomain(lower);
  const metaKey = `seo:meta:v1:${h}`;
  const robotsKey = `seo:robots:v1:${h}`;
  const fetchedAt = new Date().toISOString();

  // Try cached meta first
  const cached = await cacheGet<SeoResponse>(metaKey);
  if (cached) {
    return cached;
  }

  let finalUrl: string | null = `https://${lower}/`;
  let status: number | null = null;
  let meta: ReturnType<typeof parseHtmlMeta> | null = null;
  let robots: ReturnType<typeof parseRobotsTxt> | null = null;
  const errors: NonNullable<SeoResponse["errors"]> = {};

  // Fetch HTML
  try {
    const res = await fetchWithTimeout(finalUrl, {
      method: "GET",
      redirect: "follow",
      timeoutMs: 10000,
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en",
        "User-Agent": USER_AGENT,
      },
    });
    status = res.status;
    finalUrl = res.url;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      errors.html = `Non-HTML content-type: ${contentType}`;
    } else {
      const text = await res.text();
      const max = 512 * 1024;
      const html = text.length > max ? text.slice(0, max) : text;
      meta = parseHtmlMeta(html, finalUrl);
    }
  } catch (err) {
    errors.html = String(err);
  }

  // Fetch robots in parallel with meta cache set for resilience
  try {
    const r = await cacheGet<ReturnType<typeof parseRobotsTxt>>(robotsKey);
    if (r) {
      robots = r;
    } else {
      const robotsUrl = `https://${lower}/robots.txt`;
      const res = await fetchWithTimeout(robotsUrl, {
        method: "GET",
        timeoutMs: 8000,
        headers: { Accept: "text/plain", "User-Agent": USER_AGENT },
      });
      if (res.ok) {
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("text/plain") || ct.includes("text/")) {
          const txt = await res.text();
          robots = parseRobotsTxt(txt);
          await cacheSet(robotsKey, robots, 12 * 60 * 60);
        } else {
          errors.robots = `Unexpected robots content-type: ${ct}`;
        }
      } else {
        errors.robots = `HTTP ${res.status}`;
      }
    }
  } catch (err) {
    errors.robots = String(err);
  }

  const preview = meta
    ? selectPreview(meta, finalUrl ?? `https://${lower}/`)
    : null;

  const response: SeoResponse = {
    meta,
    robots,
    preview,
    timestamps: { fetchedAt },
    source: { finalUrl, status },
    ...(Object.keys(errors).length ? { errors } : {}),
  };

  // Cache the combined response for 6 hours
  try {
    await cacheSet(metaKey, response, 6 * 60 * 60);
  } catch {}

  await captureServer("seo_fetch", {
    domain: lower,
    status: status ?? -1,
    has_meta: !!meta,
    has_robots: !!robots,
    has_errors: Object.keys(errors).length > 0,
  });

  return response;
}
