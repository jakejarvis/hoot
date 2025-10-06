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

type UploadResult = { url: string; key: string };

function extractUploadResult(
  result:
    | { data?: { url?: string; key?: string } }
    | { url?: string; key?: string }
    | Array<
        | { data?: { url?: string; key?: string } }
        | { url?: string; key?: string }
      >,
): UploadResult {
  const entry = Array.isArray(result) ? result[0] : result;
  const data =
    (entry as { data?: { url?: string; key?: string } }).data ??
    (entry as { url?: string; key?: string });
  const url = data?.url;
  const key = data?.key;
  if (!url || !key)
    throw new Error("Upload failed: missing url/key in response");
  return { url, key };
}

export async function uploadFavicon(options: {
  domain: string;
  size: number;
  png: Buffer;
}): Promise<UploadResult> {
  const { domain, size, png } = options;
  // File name is for observability only; UploadThing manages the key
  const fileName = `favicon-${domain}-${size}.png`;
  const file = new File([png], fileName, { type: "image/png" });
  const result = await utapi.uploadFiles(file);
  return extractUploadResult(result);
}

export async function uploadScreenshot(options: {
  domain: string;
  width: number;
  height: number;
  png: Buffer;
}): Promise<UploadResult> {
  const { domain, width, height, png } = options;
  const fileName = `screenshot-${domain}-${width}x${height}.png`;
  const file = new File([png], fileName, { type: "image/png" });
  const result = await utapi.uploadFiles(file);
  return extractUploadResult(result);
}
