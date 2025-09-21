import sharp from "sharp";
import { headFaviconBlob, putFaviconBlob } from "@/lib/blob";
import { captureServer } from "@/server/analytics/posthog";

const DEFAULT_SIZE = 32;
const REQUEST_TIMEOUT_MS = 4000;

// Legacy Redis-based caching removed; Blob is now the canonical store

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
  opts?: { distinctId?: string },
): Promise<{ url: string | null }> {
  const startedAt = Date.now();
  // 1) Check blob first
  try {
    const existing = await headFaviconBlob(domain, DEFAULT_SIZE);
    if (existing) {
      await captureServer(
        "favicon_fetch",
        {
          domain,
          size: DEFAULT_SIZE,
          source: "blob",
          duration_ms: Date.now() - startedAt,
          outcome: "ok",
          cache: "hit_blob",
        },
        opts?.distinctId,
      );
      return { url: existing };
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

      const png = await convertToPng(buf, contentType, DEFAULT_SIZE);
      if (!png) continue;

      const source = (() => {
        if (src.includes("icons.duckduckgo.com")) return "duckduckgo";
        if (src.includes("www.google.com/s2/favicons")) return "google";
        if (src.startsWith("https://")) return "direct_https";
        if (src.startsWith("http://")) return "direct_http";
        return "unknown";
      })();

      const url = await putFaviconBlob(domain, DEFAULT_SIZE, png);

      await captureServer(
        "favicon_fetch",
        {
          domain,
          size: DEFAULT_SIZE,
          source,
          upstream_status: res.status,
          upstream_content_type: contentType ?? null,
          duration_ms: Date.now() - startedAt,
          outcome: "ok",
          cache: "store_blob",
        },
        opts?.distinctId,
      );

      return { url };
    } catch {
      // try next source
    }
  }

  await captureServer(
    "favicon_fetch",
    {
      domain,
      size: DEFAULT_SIZE,
      duration_ms: Date.now() - startedAt,
      outcome: "not_found",
      cache: "miss",
    },
    opts?.distinctId,
  );
  return { url: null };
}
