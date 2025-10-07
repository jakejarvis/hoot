import { captureServer } from "@/lib/analytics/server";
import { USER_AGENT } from "@/lib/constants";
import { optimizePngCover } from "@/lib/image";
import { acquireLockOrWaitForResult, ns, redis } from "@/lib/redis";
import type { SeoResponse } from "@/lib/schemas";
import { parseHtmlMeta, parseRobotsTxt, selectPreview } from "@/lib/seo";
import {
  deterministicHash,
  getSocialPreviewTtlSeconds,
  uploadImage,
} from "@/lib/storage";

const HTML_TTL_SECONDS = 6 * 60 * 60; // 6 hours
const ROBOTS_TTL_SECONDS = 12 * 60 * 60; // 12 hours
const SOCIAL_WIDTH = 1200;
const SOCIAL_HEIGHT = 630;

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

  // If a social image is present, store a cached copy via UploadThing for privacy
  if (preview?.image) {
    try {
      const stored = await getOrCreateSocialPreviewImageUrl(
        lower,
        preview.image,
      );
      preview.image = stored?.url ?? null;
    } catch {
      // On failure, avoid leaking external image URL
      preview.image = null;
    }
  }

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

async function getOrCreateSocialPreviewImageUrl(
  domain: string,
  imageUrl: string,
): Promise<{ url: string | null }> {
  const startedAt = Date.now();
  const lower = domain.toLowerCase();
  const hash = deterministicHash(imageUrl);

  const indexKey = ns(
    "seo:image-url",
    `${lower}:${hash}:${SOCIAL_WIDTH}x${SOCIAL_HEIGHT}`,
  );
  const lockKey = ns(
    "lock",
    `${lower}:seo-image:${hash}:${SOCIAL_WIDTH}x${SOCIAL_HEIGHT}`,
  );

  // 1) Check Redis index first
  try {
    const raw = (await redis.get(indexKey)) as { url?: unknown } | null;
    if (raw && typeof raw === "object" && typeof raw.url === "string") {
      await captureServer("seo_image", {
        domain: lower,
        width: SOCIAL_WIDTH,
        height: SOCIAL_HEIGHT,
        source: "redis",
        duration_ms: Date.now() - startedAt,
        outcome: "ok",
        cache: "hit",
      });
      return { url: raw.url };
    }
  } catch {
    // ignore and continue
  }

  // 2) Acquire lock or wait for another process to complete
  const lockResult = await acquireLockOrWaitForResult<{ url: string }>({
    lockKey,
    resultKey: indexKey,
    lockTtl: 30,
  });

  if (!lockResult.acquired) {
    if (lockResult.cachedResult?.url) {
      await captureServer("seo_image", {
        domain: lower,
        width: SOCIAL_WIDTH,
        height: SOCIAL_HEIGHT,
        source: "redis_wait",
        duration_ms: Date.now() - startedAt,
        outcome: "ok",
        cache: "wait",
      });
      return { url: lockResult.cachedResult.url };
    }
    return { url: null };
  }

  // 3) We acquired the lock - fetch, process, upload
  try {
    const res = await fetchWithTimeout(imageUrl, {
      method: "GET",
      timeoutMs: 8000,
      headers: {
        Accept:
          "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.9,*/*;q=0.8",
        "User-Agent": USER_AGENT,
      },
    });

    if (!res.ok) return { url: null };
    const contentType = res.headers.get("content-type") ?? "";
    if (!/image\//.test(contentType)) return { url: null };

    const ab = await res.arrayBuffer();
    const raw = Buffer.from(ab);

    const png = await optimizePngCover(raw, SOCIAL_WIDTH, SOCIAL_HEIGHT);
    if (!png || png.length === 0) return { url: null };

    const { url, key } = await uploadImage({
      kind: "social",
      domain: lower,
      width: SOCIAL_WIDTH,
      height: SOCIAL_HEIGHT,
      png,
    });

    try {
      const ttl = getSocialPreviewTtlSeconds();
      const expiresAtMs = Date.now() + ttl * 1000;
      await redis.set(indexKey, { url, key, expiresAtMs }, { ex: ttl });
      await redis.zadd(ns("purge", "social"), {
        score: expiresAtMs,
        member: key,
      });
    } catch {}

    await captureServer("seo_image", {
      domain: lower,
      width: SOCIAL_WIDTH,
      height: SOCIAL_HEIGHT,
      source: "upload",
      duration_ms: Date.now() - startedAt,
      outcome: "ok",
      cache: "store",
    });

    return { url };
  } catch {
    return { url: null };
  } finally {
    try {
      await redis.del(lockKey);
    } catch {}
  }
}
