import { captureServer } from "@/lib/analytics/server";
import { USER_AGENT } from "@/lib/constants";
import { convertBufferToSquarePng } from "@/lib/image";
import { acquireLockOrWaitForResult, ns, redis } from "@/lib/redis";
import { getFaviconTtlSeconds, uploadImage } from "@/lib/storage";

const DEFAULT_SIZE = 32;
const REQUEST_TIMEOUT_MS = 1500; // per each method
const LOCK_TTL_SECONDS = 30; // lock TTL for upload coordination

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

  const indexKey = ns("favicon:url", `${domain}:${DEFAULT_SIZE}`);
  const lockKey = ns("lock", `favicon:${domain}:${DEFAULT_SIZE}`);

  // 1) Check Redis index first
  try {
    console.debug("[favicon] redis get", { key: indexKey });
    const raw = (await redis.get(indexKey)) as { url?: unknown } | null;
    if (raw && typeof raw === "object" && typeof raw.url === "string") {
      console.info("[favicon] cache hit", {
        domain,
        size: DEFAULT_SIZE,
        url: raw.url,
      });
      await captureServer("favicon_result", {
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

  // 2) Acquire lock or wait for another process to complete
  const lockResult = await acquireLockOrWaitForResult<{ url: string }>({
    lockKey,
    resultKey: indexKey,
    lockTtl: LOCK_TTL_SECONDS,
  });

  if (!lockResult.acquired) {
    // Another process was working on it
    if (lockResult.cachedResult?.url) {
      console.info("[favicon] found result from other process", {
        domain,
        size: DEFAULT_SIZE,
        url: lockResult.cachedResult.url,
      });
      await captureServer("favicon_result", {
        domain,
        size: DEFAULT_SIZE,
        source: "redis_wait",
        duration_ms: Date.now() - startedAt,
        outcome: "ok",
        cache: "wait",
      });
      return { url: lockResult.cachedResult.url };
    }
    // Timeout or other process failed - return null
    console.warn("[favicon] wait timeout, no result", { domain });
    return { url: null };
  }

  // 3) We acquired the lock - fetch/convert/upload
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
        const { url, key } = await uploadImage({
          kind: "favicon",
          domain,
          width: DEFAULT_SIZE,
          height: DEFAULT_SIZE,
          png,
        });
        console.info("[favicon] uploaded", { url, key });

        // Write Redis index and schedule purge
        try {
          const ttl = getFaviconTtlSeconds();
          const expiresAtMs = Date.now() + ttl * 1000;
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

        await captureServer("favicon_result", {
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

    await captureServer("favicon_result", {
      domain,
      size: DEFAULT_SIZE,
      duration_ms: Date.now() - startedAt,
      outcome: "not_found",
      cache: "miss",
    });
    console.warn("[favicon] not found after trying all sources", { domain });
    return { url: null };
  } finally {
    // Release lock (best effort)
    try {
      await redis.del(lockKey);
    } catch {
      // ignore
    }
  }
}
