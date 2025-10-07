import { captureServer } from "@/lib/analytics/server";
import { USER_AGENT } from "@/lib/constants";
import { ns, redis } from "@/lib/redis";
import type { SeoResponse } from "@/lib/schemas";
import { parseHtmlMeta, parseRobotsTxt, selectPreview } from "@/lib/seo";

const HTML_TTL_SECONDS = 6 * 60 * 60; // 6 hours
const ROBOTS_TTL_SECONDS = 12 * 60 * 60; // 12 hours

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
  const baseKey = ns("seo", lower);
  const metaKey = ns(`${baseKey}:meta`, "v1");
  const robotsKey = ns(`${baseKey}:robots`, "v1");

  const cached = await redis.get<SeoResponse>(metaKey);
  if (cached) return cached;

  let finalUrl: string | null = `https://${lower}/`;
  let status: number | null = null;
  let htmlError: string | undefined;
  let robotsError: string | undefined;

  let meta: ReturnType<typeof parseHtmlMeta> | null = null;
  let robots: ReturnType<typeof parseRobotsTxt> | null = null;

  // HTML fetch
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
      htmlError = `Non-HTML content-type: ${contentType}`;
    } else {
      const text = await res.text();
      const max = 512 * 1024;
      const html = text.length > max ? text.slice(0, max) : text;
      meta = parseHtmlMeta(html, finalUrl);
    }
  } catch (err) {
    htmlError = String(err);
  }

  // robots.txt fetch (with cache)
  try {
    const cachedRobots =
      await redis.get<ReturnType<typeof parseRobotsTxt>>(robotsKey);
    if (cachedRobots) {
      robots = cachedRobots;
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
          await redis.set(robotsKey, robots, { ex: ROBOTS_TTL_SECONDS });
        } else {
          robotsError = `Unexpected robots content-type: ${ct}`;
        }
      } else {
        robotsError = `HTTP ${res.status}`;
      }
    }
  } catch (err) {
    robotsError = String(err);
  }

  const preview = meta
    ? selectPreview(meta, finalUrl ?? `https://${lower}/`)
    : null;

  const response: SeoResponse = {
    meta,
    robots,
    preview,
    source: { finalUrl, status },
    ...(htmlError || robotsError
      ? {
          errors: {
            ...(htmlError ? { html: htmlError } : {}),
            ...(robotsError ? { robots: robotsError } : {}),
          },
        }
      : {}),
  };

  await redis.set(metaKey, response, { ex: HTML_TTL_SECONDS });

  await captureServer("seo_fetch", {
    domain: lower,
    status: status ?? -1,
    has_meta: !!meta,
    has_robots: !!robots,
    has_errors: Boolean(htmlError || robotsError),
  });

  return response;
}
