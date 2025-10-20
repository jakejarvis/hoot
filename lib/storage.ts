import "server-only";

import { createHmac } from "node:crypto";
import { makePublicUrl, putObject } from "@/lib/r2";
import type { StorageKind } from "@/lib/schemas";

const UPLOAD_MAX_ATTEMPTS = 3;
const UPLOAD_BACKOFF_BASE_MS = 100;
const UPLOAD_BACKOFF_MAX_MS = 2000;

/**
 * Deterministic, obfuscated hash for IDs and filenames.
 * Requires a dedicated BLOB_SIGNING_SECRET in non-dev environments.
 */
function deterministicHash(input: string, length = 32): string {
  const isDev = process.env.NODE_ENV === "development";
  const secret = process.env.BLOB_SIGNING_SECRET;
  if (!secret && !isDev) {
    throw new Error("BLOB_SIGNING_SECRET is not set");
  }
  const stableSecret = secret || "dev-hmac-secret";
  return createHmac("sha256", stableSecret)
    .update(input)
    .digest("hex")
    .slice(0, length);
}

function makeObjectKey(
  kind: StorageKind,
  filename: string,
  hashParts: Array<string | number>,
  extension = "bin",
): string {
  const base = `${kind}:${hashParts.join(":")}`;
  const digest = deterministicHash(base);
  return `${digest}/${filename}.${extension}`;
}

/**
 * Build a deterministic object key for image-like blobs.
 */

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
 * Upload buffer to R2 with retry logic and exponential backoff
 */
async function uploadWithRetry(
  key: string,
  buffer: Buffer,
  contentType: string,
  cacheControl?: string,
  maxAttempts = UPLOAD_MAX_ATTEMPTS,
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.debug("[storage] upload attempt", {
        key,
        attempt: attempt + 1,
        maxAttempts,
      });

      await putObject({
        key,
        body: buffer,
        contentType,
        cacheControl,
      });

      console.info("[storage] upload success", {
        key,
        attempt: attempt + 1,
      });

      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      console.warn("[storage] upload attempt failed", {
        key,
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
          key,
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

export async function storeBlob(options: {
  kind: StorageKind;
  buffer: Buffer;
  key?: string;
  contentType?: string;
  extension?: string;
  filename?: string;
  extraParts?: Array<string | number>;
  cacheControl?: string;
}): Promise<{ url: string; key: string }> {
  const {
    kind,
    buffer,
    key: providedKey,
    contentType: providedCt,
    extension: providedExt,
    filename: providedFilename,
    extraParts = [],
    cacheControl,
  } = options;

  let contentType = providedCt;
  let extension = providedExt;
  let filename = providedFilename;

  if (!contentType || !extension) {
    try {
      const { fileTypeFromBuffer } = await import("file-type");
      const ft = await fileTypeFromBuffer(buffer);
      if (!contentType) contentType = ft?.mime;
      if (!extension) extension = ft?.ext;
    } catch {
      // ignore detection errors; use fallbacks below
    }
  }

  contentType = contentType || "application/octet-stream";
  extension = extension || "bin";
  filename = filename || "file";

  const key =
    providedKey || makeObjectKey(kind, filename, extraParts, extension);
  await uploadWithRetry(key, buffer, contentType, cacheControl);
  return { url: makePublicUrl(key), key };
}

export async function storeImage(options: {
  kind: StorageKind;
  domain: string;
  buffer: Buffer;
  width?: number;
  height?: number;
  contentType?: string;
  extension?: string;
  cacheControl?: string;
}): Promise<{ url: string; key: string }> {
  const {
    kind,
    domain,
    buffer,
    width: providedW,
    height: providedH,
    contentType,
    extension,
    cacheControl,
  } = options;

  let width = providedW;
  let height = providedH;

  if (!width || !height) {
    try {
      const { imageSize } = await import("image-size");
      const dim = imageSize(buffer);
      if (!width && typeof dim.width === "number") width = dim.width;
      if (!height && typeof dim.height === "number") height = dim.height;
    } catch {
      // ignore; width/height remain undefined
    }
  }

  const finalWidth = width ?? 0;
  const finalHeight = height ?? 0;
  const key = makeObjectKey(
    kind,
    `${finalWidth}x${finalHeight}`,
    [domain, kind, `${finalWidth}x${finalHeight}`],
    extension || "webp",
  );

  return await storeBlob({
    kind,
    buffer,
    key,
    contentType: contentType || undefined,
    extension: extension || undefined,
    cacheControl,
  });
}
