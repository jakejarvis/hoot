import "server-only";

import { UTApi, UTFile } from "uploadthing/server";

const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;
const UPLOAD_MAX_ATTEMPTS = 3;
const UPLOAD_BACKOFF_BASE_MS = 100;
const UPLOAD_BACKOFF_MAX_MS = 2000;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelayMs(
  attemptIndex: number,
  baseMs: number,
  maxMs: number,
): number {
  const base = Math.min(maxMs, baseMs * 2 ** attemptIndex);
  const jitter = Math.floor(Math.random() * Math.min(base, maxMs) * 0.25);
  return Math.min(base + jitter, maxMs);
}

/**
 * Extract upload result from UploadThing response
 * Returns url and customId (for deletion) on success, throws on failure
 */
function extractUploadResult(
  result: UploadThingResult,
  customId: string,
): { url: string; key: string } {
  const entry = (Array.isArray(result) ? result[0] : result) as {
    data: { key?: string; ufsUrl?: string; url?: string } | null;
    error: unknown | null;
  };

  if (entry?.error) {
    throw new Error(
      `UploadThing error: ${entry.error instanceof Error ? entry.error.message : String(entry.error)}`,
    );
  }

  const url = entry?.data?.ufsUrl;
  if (typeof url === "string") {
    // Return customId as the stored identifier to enable deletion by customId
    return { url, key: customId };
  }

  throw new Error("Upload failed: missing url in response");
}

/**
 * Upload file with retry logic and exponential backoff
 */
async function uploadWithRetry(
  file: UTFile,
  customId: string,
  maxAttempts = UPLOAD_MAX_ATTEMPTS,
): Promise<{ url: string; key: string }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.debug("[storage] upload attempt", {
        customId,
        attempt: attempt + 1,
        maxAttempts,
      });

      const result = await utapi.uploadFiles(file);
      const extracted = extractUploadResult(result, customId);

      console.info("[storage] upload success", {
        customId,
        attempt: attempt + 1,
        url: extracted.url,
      });

      return extracted;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      console.warn("[storage] upload attempt failed", {
        customId,
        attempt: attempt + 1,
        error: lastError.message,
      });

      // Don't sleep on last attempt
      if (attempt < maxAttempts - 1) {
        const delay = backoffDelayMs(
          attempt,
          UPLOAD_BACKOFF_BASE_MS,
          UPLOAD_BACKOFF_MAX_MS,
        );
        console.debug("[storage] retrying after delay", {
          customId,
          delayMs: delay,
        });
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `Upload failed after ${maxAttempts} attempts: ${lastError?.message ?? "unknown error"}`,
  );
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

  return await uploadWithRetry(file, customId);
}
