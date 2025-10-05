import { captureServer } from "@/lib/analytics/server";
import { getFaviconTtlSeconds, putFaviconBlob } from "@/lib/blob";
import { USER_AGENT } from "@/lib/constants";
import { convertBufferToSquarePng } from "@/lib/image";
import { ns, redis } from "@/lib/redis";

const DEFAULT_SIZE = 32;
const REQUEST_TIMEOUT_MS = 1500; // per each method

// Legacy Redis-based caching removed; Blob is now the canonical store

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        Accept: "image/avif,image/webp,image/png,image/*;q=0.9,*/*;q=0.8",
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
      ...init,
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}

function buildSources(domain: string): string[] {
  const enc = encodeURIComponent(domain);
  return [
    `https://icons.duckduckgo.com/ip3/${enc}.ico`,
    `https://www.google.com/s2/favicons?domain=${enc}&sz=${DEFAULT_SIZE}`,
    `https://${domain}/favicon.ico`,
    `http://${domain}/favicon.ico`,
  ];
}

// Legacy getFaviconPngForDomain removed

export async function getOrCreateFaviconBlobUrl(
  domain: string,
): Promise<{ url: string | null }> {
  const startedAt = Date.now();
  // 1) Check Redis index first
  try {
    const key = ns("favicon:url", `${domain}:${DEFAULT_SIZE}`);
    const raw = await redis.get<string>(key);
    if (raw) {
      const parsed = JSON.parse(raw) as { url: string };
      await captureServer("favicon_fetch", {
        domain,
        size: DEFAULT_SIZE,
        source: "redis",
        duration_ms: Date.now() - startedAt,
        outcome: "ok",
        cache: "hit",
      });
      return { url: parsed.url };
    }
  } catch {
    // ignore and proceed to fetch
  }

  // 2) Fetch/convert via existing pipeline, then upload
  const sources = buildSources(domain);
  for (const src of sources) {
    try {
      const res = await fetchWithTimeout(src);
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type");
      const ab = await res.arrayBuffer();
      const buf = Buffer.from(ab);

      const png = await convertBufferToSquarePng(
        buf,
        DEFAULT_SIZE,
        contentType,
      );
      if (!png) continue;

      const source = (() => {
        if (src.includes("icons.duckduckgo.com")) return "duckduckgo";
        if (src.includes("www.google.com/s2/favicons")) return "google";
        if (src.startsWith("https://")) return "direct_https";
        if (src.startsWith("http://")) return "direct_http";
        return "unknown";
      })();

      const url = await putFaviconBlob(domain, DEFAULT_SIZE, png);

      // 3) Write Redis index and schedule purge
      try {
        const ttl = getFaviconTtlSeconds();
        const expiresAtMs = Date.now() + ttl * 1000;
        const key = ns("favicon:url", `${domain}:${DEFAULT_SIZE}`);
        await redis.set(key, JSON.stringify({ url, expiresAtMs }), {
          ex: ttl,
        });
        await redis.zadd(ns("purge", "favicon"), {
          score: expiresAtMs,
          member: url, // store full URL for deletion API
        });
      } catch {
        // best effort
      }

      await captureServer("favicon_fetch", {
        domain,
        size: DEFAULT_SIZE,
        source,
        upstream_status: res.status,
        upstream_content_type: contentType ?? null,
        duration_ms: Date.now() - startedAt,
        outcome: "ok",
        cache: "store",
      });

      return { url };
    } catch {
      // try next source
    }
  }

  await captureServer("favicon_fetch", {
    domain,
    size: DEFAULT_SIZE,
    duration_ms: Date.now() - startedAt,
    outcome: "not_found",
    cache: "miss",
  });
  return { url: null };
}
