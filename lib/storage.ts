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

async function extractUploadResultOrFallback(
  result: UploadThingResult,
  customId: string,
): Promise<{ url: string; key: string }> {
  const entry = (Array.isArray(result) ? result[0] : result) as {
    data: { key?: string; ufsUrl?: string; url?: string } | null;
    error: unknown | null;
  };
  const url = entry?.data?.ufsUrl;
  if (typeof url === "string") {
    // Return customId as the stored identifier to enable deletion by customId
    return { url, key: customId };
  }

  // Fallback path (likely AlreadyExists due to same customId). Probe constructed URL.
  const appId = process.env.UPLOADTHING_APP_ID;
  if (appId) {
    const ufsUrl = `https://${appId}.ufs.sh/f/${customId}`;
    try {
      const res = await fetch(ufsUrl, { method: "HEAD", cache: "no-store" });
      if (res.ok) return { url: ufsUrl, key: customId };
    } catch {}
  }
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
  return await extractUploadResultOrFallback(result, customId);
}
