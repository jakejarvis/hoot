import "server-only";

import { UTApi, UTFile } from "uploadthing/server";

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
  const url = entry?.data?.ufsUrl;
  if (typeof key === "string" && typeof url === "string") return { url, key };
  throw new Error("Upload failed: missing url/key in response");
}

export async function uploadImage(options: {
  kind: "favicon" | "screenshot";
  domain: string;
  width: number;
  height: number;
  png: Buffer;
}): Promise<{ url: string; key: string }> {
  const { kind, domain, width, height, png } = options;
  const safeDomain = domain.replace(/[^a-zA-Z0-9]/g, "-");
  const fileName = `${kind}_${safeDomain}_${width}x${height}.png`;
  const customId = fileName; // deterministic id to prevent duplicate uploads
  const file = new UTFile([new Uint8Array(png)], fileName, {
    type: "image/png",
    customId,
  });
  const result = await utapi.uploadFiles(file);
  return extractUploadResult(result);
}
