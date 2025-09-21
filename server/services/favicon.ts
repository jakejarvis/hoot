import sharp from "sharp";
import { cacheGet, cacheSet, ns } from "@/lib/redis";
import { captureServer } from "@/server/analytics/posthog";

const DEFAULT_SIZE = 32;
const MIN_SIZE = 16;
const MAX_SIZE = 256;
const REQUEST_TIMEOUT_MS = 4000;
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const NEGATIVE_CACHE_TTL_SECONDS = 6 * 60 * 60; // 6 hours for not-found
// Use a single Redis key for both positive and negative results; this sentinel marks a negative entry
const NEGATIVE_CACHE_SENTINEL = "!" as const;

export function clampFaviconSize(value: number | null | undefined): number {
  if (!value || Number.isNaN(value)) return DEFAULT_SIZE;
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(value)));
}

function isIcoBuffer(buf: Buffer): boolean {
  return (
    buf.length >= 4 &&
    buf[0] === 0x00 &&
    buf[1] === 0x00 &&
    buf[2] === 0x01 &&
    buf[3] === 0x00
  );
}

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
        "User-Agent": "hoot.sh/0.1 (+https://hoot.sh)",
      },
      signal: controller.signal,
      ...init,
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function convertToPng(
  input: Buffer,
  contentType: string | null,
  size: number,
): Promise<Buffer | null> {
  try {
    const img = sharp(input, { failOn: "none" });
    const pipeline = img
      .resize(size, size, { fit: "cover" })
      .png({ compressionLevel: 9 });
    return await pipeline.toBuffer();
  } catch {
    // ignore and try ICO-specific decode if it looks like ICO
  }

  if (isIcoBuffer(input) || (contentType && /icon/.test(contentType))) {
    try {
      type IcoFrame = {
        width: number;
        height: number;
        buffer?: ArrayBuffer;
        data?: ArrayBuffer;
      };
      const mod = (await import("icojs")) as unknown as {
        parse: (buf: ArrayBuffer, outputType?: string) => Promise<IcoFrame[]>;
      };
      const arr = (input.buffer as ArrayBuffer).slice(
        input.byteOffset,
        input.byteOffset + input.byteLength,
      ) as ArrayBuffer;
      const frames = await mod.parse(arr as ArrayBuffer, "image/png");
      if (Array.isArray(frames) && frames.length > 0) {
        let chosen: IcoFrame = frames[0];
        chosen = frames.reduce((best: IcoFrame, cur: IcoFrame) => {
          const bw = Number(best?.width ?? 0);
          const cw = Number(cur?.width ?? 0);
          const bh = Number(best?.height ?? 0);
          const ch = Number(cur?.height ?? 0);
          const bDelta = Math.abs(Math.max(bw, bh) - size);
          const cDelta = Math.abs(Math.max(cw, ch) - size);
          return cDelta < bDelta ? cur : best;
        }, chosen);

        const arrBuf: ArrayBuffer | undefined = chosen.buffer ?? chosen.data;
        if (arrBuf) {
          const pngBuf = Buffer.from(arrBuf);
          return await sharp(pngBuf)
            .resize(size, size, { fit: "cover" })
            .png({ compressionLevel: 9 })
            .toBuffer();
        }
      }
    } catch {
      // Fall through to null
    }
  }

  return null;
}

function buildSources(domain: string, size: number): string[] {
  const enc = encodeURIComponent(domain);
  return [
    `https://icons.duckduckgo.com/ip3/${enc}.ico`,
    `https://www.google.com/s2/favicons?domain=${enc}&sz=${size}`,
    `https://${domain}/favicon.ico`,
    `http://${domain}/favicon.ico`,
  ];
}

export async function getFaviconPngForDomain(
  domain: string,
  size: number,
  opts?: { distinctId?: string },
): Promise<Buffer | null> {
  const cacheKey = ns("favicon", `${domain}:${size}`);
  const sources = buildSources(domain, size);
  const startedAt = Date.now();

  // Try cache first
  try {
    const cachedValue = await cacheGet<string>(cacheKey);
    if (cachedValue) {
      if (cachedValue === NEGATIVE_CACHE_SENTINEL) {
        await captureServer(
          "favicon_fetch",
          {
            domain,
            size,
            source: "cache_redis",
            duration_ms: Date.now() - startedAt,
            outcome: "not_found",
            cache: "hit_negative",
          },
          opts?.distinctId,
        );
        return null;
      }
      const pngFromCache = Buffer.from(cachedValue, "base64");
      await captureServer(
        "favicon_fetch",
        {
          domain,
          size,
          source: "cache_redis",
          duration_ms: Date.now() - startedAt,
          outcome: "ok",
          cache: "hit",
        },
        opts?.distinctId,
      );
      return pngFromCache;
    }
  } catch {
    // ignore cache errors and fall through
  }

  for (const src of sources) {
    try {
      const res = await fetchWithTimeout(src);
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type");
      const ab = await res.arrayBuffer();
      const buf = Buffer.from(ab);

      const png = await convertToPng(buf, contentType, size);
      if (!png) continue;

      const source = (() => {
        if (src.includes("icons.duckduckgo.com")) return "duckduckgo";
        if (src.includes("www.google.com/s2/favicons")) return "google_s2";
        if (src.startsWith("https://")) return "direct_https";
        if (src.startsWith("http://")) return "direct_http";
        return "unknown";
      })();

      // Attempt to store in cache (base64) for subsequent hits
      try {
        await cacheSet<string>(
          cacheKey,
          png.toString("base64"),
          CACHE_TTL_SECONDS,
        );
      } catch {
        // ignore cache errors
      }

      await captureServer(
        "favicon_fetch",
        {
          domain,
          size,
          source,
          upstream_status: res.status,
          upstream_content_type: contentType ?? null,
          duration_ms: Date.now() - startedAt,
          outcome: "ok",
          cache: "store",
        },
        opts?.distinctId,
      );

      return png;
    } catch {
      // Try next source
    }
  }
  // Store negative cache using the same key and capture analytics
  try {
    await cacheSet<string>(
      cacheKey,
      NEGATIVE_CACHE_SENTINEL,
      NEGATIVE_CACHE_TTL_SECONDS,
    );
  } catch {
    // ignore cache errors
  }
  await captureServer(
    "favicon_fetch",
    {
      domain,
      size,
      duration_ms: Date.now() - startedAt,
      outcome: "not_found",
      cache: "store_negative",
    },
    opts?.distinctId,
  );
  return null;
}
