import "server-only";

import { createHmac, randomBytes } from "node:crypto";
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

export function getSocialPreviewTtlSeconds(): number {
  return toPositiveInt(
    process.env.SOCIAL_PREVIEW_TTL_SECONDS,
    ONE_WEEK_SECONDS,
  );
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
 * Returns randomized URL and UploadThing file key; throws on failure
 */
function extractUploadResult(result: UploadThingResult): {
  url: string;
  key: string;
} {
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
  const key = entry?.data?.key;
  if (typeof url === "string" && typeof key === "string") {
    return { url, key };
  }

  throw new Error("Upload failed: missing url or key in response");
}

/**
 * Upload file with retry logic and exponential backoff
 */
async function uploadWithRetry(
  file: UTFile,
  maxAttempts = UPLOAD_MAX_ATTEMPTS,
): Promise<{ url: string; key: string }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.debug("[storage] upload attempt", {
        fileName: (file as unknown as { name?: string }).name ?? "unknown",
        attempt: attempt + 1,
        maxAttempts,
      });

      const result = await utapi.uploadFiles(file);
      const extracted = extractUploadResult(result);

      console.info("[storage] upload success", {
        fileName: (file as unknown as { name?: string }).name ?? "unknown",
        attempt: attempt + 1,
        url: extracted.url,
      });

      return extracted;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      console.warn("[storage] upload attempt failed", {
        fileName: (file as unknown as { name?: string }).name ?? "unknown",
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
          fileName: (file as unknown as { name?: string }).name ?? "unknown",
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
  kind: "favicon" | "screenshot" | "social";
  domain: string;
  width: number;
  height: number;
  png: Buffer;
}): Promise<{ url: string; key: string }> {
  const { kind, domain, width, height, png } = options;
  const fileName = (() => {
    const base = `${kind}:${domain}:${width}x${height}`;
    const secret = process.env.UPLOADTHING_SECRET || "dev-hmac-secret";
    const nonce = randomBytes(8).toString("hex");
    const digest = createHmac("sha256", secret)
      .update(`${base}:${nonce}`)
      .digest("hex")
      .slice(0, 32);
    return `${kind}_${digest}.png`;
  })();
  const file = new UTFile([new Uint8Array(png)], fileName, {
    type: "image/png",
  });

  return await uploadWithRetry(file);
}
