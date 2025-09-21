import { NextResponse } from "next/server";
import sharp from "sharp";
import { toRegistrableDomain } from "@/lib/domain-server";
import { captureServer } from "@/server/analytics/posthog";

export const runtime = "nodejs";
export const maxDuration = 10;

const DEFAULT_SIZE = 32;
const MIN_SIZE = 16;
const MAX_SIZE = 256;
const REQUEST_TIMEOUT_MS = 4000;

function clampSize(value: number | null | undefined): number {
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
      // Prefer images; some providers return SVG/ICO/PNG depending on Accept
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
  // Try sharp first; it can handle many formats (PNG/JPEG/WebP/AVIF/SVG/ICO depending on libvips build)
  try {
    const img = sharp(input, { failOn: "none" });
    // If size provided, square resize with cover to avoid distortion
    const pipeline = img
      .resize(size, size, { fit: "cover" })
      .png({ compressionLevel: 9 });
    return await pipeline.toBuffer();
  } catch {
    // ignore and try ICO-specific decode if it looks like ICO
  }

  if (isIcoBuffer(input) || (contentType && /icon/.test(contentType))) {
    try {
      // Lazy import to reduce cold start
      type IcoFrame = {
        width: number;
        height: number;
        buffer?: ArrayBuffer;
        data?: ArrayBuffer;
      };
      const mod = (await import("icojs")) as unknown as {
        parse: (buf: ArrayBuffer, outputType?: string) => Promise<IcoFrame[]>;
      };
      // Convert Buffer -> exact ArrayBuffer slice for parse() and ensure ArrayBuffer type
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
          // Ensure final size/output via sharp pipeline
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
    // DuckDuckGo service (ICO)
    `https://icons.duckduckgo.com/ip3/${enc}.ico`,
    // Google S2 favicons (PNG); sz is the pixel size; cap at MAX_SIZE
    `https://www.google.com/s2/favicons?domain=${enc}&sz=${size}`,
    // Direct site favicon over HTTPS then HTTP
    `https://${domain}/favicon.ico`,
    `http://${domain}/favicon.ico`,
  ];
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("domain") ?? url.searchParams.get("d");
  const sizeParam = Number(
    url.searchParams.get("size") ?? url.searchParams.get("sz") ?? "",
  );
  const size = clampSize(sizeParam);
  const startedAt = Date.now();
  // Attempt to associate events with user via PostHog cookie
  let distinctId: string | undefined;
  try {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (key) {
      const cookieName = `ph_${key}_posthog`;
      const cookieStr = req.headers.get("cookie") ?? "";
      const m = cookieStr.match(new RegExp(`${cookieName}=([^;]+)`));
      if (m) {
        const parsed = JSON.parse(decodeURIComponent(m[1]));
        if (parsed && typeof parsed.distinct_id === "string") {
          distinctId = parsed.distinct_id;
        }
      }
    }
  } catch {
    // ignore
  }

  const registrable = raw ? toRegistrableDomain(raw) : null;
  if (!registrable) {
    await captureServer(
      "favicon_fetch",
      {
        domain: raw ?? "",
        valid: false,
        reason: "invalid_domain",
      },
      distinctId,
    );
    return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
  }

  const sources = buildSources(registrable, size);

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
      await captureServer(
        "favicon_fetch",
        {
          domain: registrable,
          size,
          source,
          upstream_status: res.status,
          upstream_content_type: contentType ?? null,
          duration_ms: Date.now() - startedAt,
          outcome: "ok",
        },
        distinctId,
      );
      return new NextResponse(png as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          // Cache for a week; allow CDN to keep for a week
          "Cache-Control": "public, max-age=604800, s-maxage=604800",
          "Content-Length": String(png.length),
        },
      });
    } catch {
      // Try next source
    }
  }

  // Transparent 1x1 PNG as final fallback (avoid error UI glitches)
  const _transparent = await sharp({
    create: {
      width: 1,
      height: 1,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();

  await captureServer(
    "favicon_fetch",
    {
      domain: registrable,
      size,
      outcome: "not_found",
      duration_ms: Date.now() - startedAt,
    },
    distinctId,
  );

  return new NextResponse("Favicon not found", {
    status: 404,
  });
}
