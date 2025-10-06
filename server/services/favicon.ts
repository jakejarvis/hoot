import { captureServer } from "@/lib/analytics/server";
import { getFaviconTtlSeconds, uploadFavicon } from "@/lib/storage";
import { USER_AGENT } from "@/lib/constants";
import { convertBufferToSquarePng } from "@/lib/image";
import { ns, redis } from "@/lib/redis";

const DEFAULT_SIZE = 32;
const REQUEST_TIMEOUT_MS = 1500; // per each method
const LOCK_TTL_SECONDS = 15;
const LOCK_WAIT_ATTEMPTS = 6;
const LOCK_WAIT_DELAY_MS = 250;

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
  console.debug("[favicon] start", { domain, size: DEFAULT_SIZE });
  // 1) Check Redis index first
  try {
    const indexKey = ns("favicon:url", `${domain}:${DEFAULT_SIZE}`);
    console.debug("[favicon] redis get", { key: indexKey });
    const raw = (await redis.get(indexKey)) as { url?: unknown } | null;
    if (raw && typeof raw === "object" && typeof raw.url === "string") {
      console.info("[favicon] cache hit", {
        domain,
        size: DEFAULT_SIZE,
        url: raw.url,
      });
      await captureServer("favicon_fetch", {
        domain,
        size: DEFAULT_SIZE,
        source: "redis",
        duration_ms: Date.now() - startedAt,
        outcome: "ok",
        cache: "hit",
      });
      return { url: raw.url };
    }
    console.debug("[favicon] cache miss", { domain, size: DEFAULT_SIZE });
  } catch {
    // ignore and proceed to fetch
  }

  // 2) Acquire short-lived lock to avoid duplicate concurrent uploads
  async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitForPublicUrl(url: string): Promise<void> {
    if (process.env.NODE_ENV === "test") return;
    for (let i = 0; i < 4; i++) {
      try {
        const res = await fetch(url, {
          method: "HEAD",
          cache: "no-store" as RequestCache,
        });
        if (res.ok) return;
      } catch {}
      await sleep(200);
    }
  }

  const lockKey = ns("lock", `favicon:${domain}:${DEFAULT_SIZE}`);
  let acquiredLock = false;
  try {
    console.debug("[favicon] lock attempt", { lockKey });
    const setRes = await redis.set(lockKey, "1", {
      nx: true,
      ex: LOCK_TTL_SECONDS,
    });
    // Upstash returns "OK" on success; our test mock returns undefined
    acquiredLock = setRes === "OK" || setRes === undefined;
    console.info("[favicon] lock status", { acquiredLock });
  } catch {
    // If the client doesn't support NX in some env, proceed without blocking
    acquiredLock = true;
    console.warn("[favicon] lock unsupported; proceeding without lock");
  }

  if (!acquiredLock) {
    // Another worker is producing the blob; wait briefly for index to be populated
    for (let i = 0; i < LOCK_WAIT_ATTEMPTS; i++) {
      try {
        const indexKey = ns("favicon:url", `${domain}:${DEFAULT_SIZE}`);
        console.debug("[favicon] waiting for index", { attempt: i + 1, key: indexKey });
        const raw = (await redis.get(indexKey)) as { url?: unknown } | null;
        if (raw && typeof raw === "object" && typeof raw.url === "string") {
          console.info("[favicon] index appeared while waiting", {
            url: raw.url,
          });
          return { url: raw.url };
        }
      } catch {}
      await sleep(LOCK_WAIT_DELAY_MS);
    }
    // Give up to avoid duplicate work; a subsequent request will retry
    console.warn("[favicon] gave up waiting for lock; returning null", {
      domain,
    });
    return { url: null };
  }

  // 3) Fetch/convert via existing pipeline, then upload
  try {
    const sources = buildSources(domain);
    for (const src of sources) {
      try {
        console.debug("[favicon] fetch source", { src });
        const res = await fetchWithTimeout(src);
        if (!res.ok) continue;
        const contentType = res.headers.get("content-type");
        const ab = await res.arrayBuffer();
        const buf = Buffer.from(ab);
        console.debug("[favicon] fetched source ok", {
          src,
          status: res.status,
          contentType,
          bytes: buf.length,
        });

        const png = await convertBufferToSquarePng(
          buf,
          DEFAULT_SIZE,
          contentType,
        );
        if (!png) continue;
        console.debug("[favicon] converted to png", {
          size: DEFAULT_SIZE,
          bytes: png.length,
        });

        const source = (() => {
          if (src.includes("icons.duckduckgo.com")) return "duckduckgo";
          if (src.includes("www.google.com/s2/favicons")) return "google";
          if (src.startsWith("https://")) return "direct_https";
          if (src.startsWith("http://")) return "direct_http";
          return "unknown";
        })();

        console.info("[favicon] uploading via uploadthing");
        const { url, key } = await uploadFavicon({
          domain,
          size: DEFAULT_SIZE,
          png,
        });
        console.info("[favicon] uploaded", { url, key });
        await waitForPublicUrl(url);
        console.debug("[favicon] public url ready", { url });

        // 3) Write Redis index and schedule purge
        try {
          const ttl = getFaviconTtlSeconds();
          const expiresAtMs = Date.now() + ttl * 1000;
          const indexKey = ns("favicon:url", `${domain}:${DEFAULT_SIZE}`);
          console.debug("[favicon] redis set index", {
            key: indexKey,
            ttlSeconds: ttl,
            expiresAtMs,
          });
          await redis.set(
            indexKey,
            { url, key, expiresAtMs },
            {
              ex: ttl,
            },
          );
          console.debug("[favicon] redis zadd purge", { key, expiresAtMs });
          await redis.zadd(ns("purge", "favicon"), {
            score: expiresAtMs,
            member: key, // store UploadThing file key for deletion API
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
      } catch (err) {
        console.warn("[favicon] source failed; trying next", {
          src,
          error: (err as Error)?.message,
        });
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
    console.warn("[favicon] not found after trying all sources", { domain });
    return { url: null };
  } finally {
    try {
      await redis.del(lockKey);
      console.debug("[favicon] lock released", { lockKey });
    } catch {}
  }
}
