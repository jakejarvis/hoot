import "server-only";

import { UTApi } from "uploadthing/server";

const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;

function toPositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function getFaviconTtlSeconds(): number {
  return toPositiveInt(process.env.FAVICON_TTL_SECONDS, ONE_WEEK_SECONDS);
}

export function getScreenshotTtlSeconds(): number {
  return toPositiveInt(process.env.SCREENSHOT_TTL_SECONDS, ONE_WEEK_SECONDS);
}

const utapi = new UTApi();

type UploadThingResult =
  | {
      data: { key?: string; ufsUrl?: string; url?: string } | null;
      error: unknown | null;
    }
  | Array<{
      data: { key?: string; ufsUrl?: string; url?: string } | null;
      error: unknown | null;
    }>;

function extractUploadResult(result: UploadThingResult) {
  const entry = (Array.isArray(result) ? result[0] : result) as {
    data: { key?: string; ufsUrl?: string; url?: string } | null;
    error: unknown | null;
  };
  const key = entry?.data?.key;
  const url = entry?.data?.ufsUrl ?? entry?.data?.url;
  if (typeof key === "string" && typeof url === "string") return { url, key };
  throw new Error("Upload failed: missing url/key in response");
}

export async function uploadFavicon(options: {
  domain: string;
  size: number;
  png: Buffer;
}): Promise<{ url: string; key: string }> {
  const { domain, size, png } = options;
  // File name is for observability only; UploadThing manages the key
  const fileName = `favicon-${domain}-${size}.png`;
  const file = new File([new Uint8Array(png)], fileName, {
    type: "image/png",
  });
  const result = await utapi.uploadFiles(file);
  return extractUploadResult(result);
}

export async function uploadScreenshot(options: {
  domain: string;
  width: number;
  height: number;
  png: Buffer;
}): Promise<{ url: string; key: string }> {
  const { domain, width, height, png } = options;
  const fileName = `screenshot-${domain}-${width}x${height}.png`;
  const file = new File([new Uint8Array(png)], fileName, {
    type: "image/png",
  });
  const result = await utapi.uploadFiles(file);
  return extractUploadResult(result);
}
