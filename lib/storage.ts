import "server-only";

import { createHmac } from "node:crypto";
import { logger } from "@/lib/logger";
import { makePublicUrl, putObject } from "@/lib/r2";
import type { StorageKind } from "@/lib/schemas";

const log = logger({ module: "storage" });

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
  extension = "bin",
  extraParts: Array<string | number>,
): string {
  const base = `${kind}:${extraParts.join(":")}`;
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
      log.debug("upload.attempt", {
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

      log.info("upload.ok", {
        key,
        attempt: attempt + 1,
      });

      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      log.warn("upload.attempt.failed", {
        key,
        attempt: attempt + 1,
        err: lastError,
      });

      // Don't sleep on last attempt
      if (attempt < maxAttempts - 1) {
        const delay = backoffDelayMs(
          attempt,
          UPLOAD_BACKOFF_BASE_MS,
          UPLOAD_BACKOFF_MAX_MS,
        );
        log.debug("retrying.after.delay", {
          key,
          delayMs: delay,
        });
        await sleep(delay);
      }
    }
  }

  throw new Error(`Upload failed after ${maxAttempts} attempts.`, {
    cause: lastError ?? undefined,
  });
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
    providedKey || makeObjectKey(kind, filename, extension, extraParts);
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

  // Defer contentType/extension selection to storeBlob by passing filename and hash parts
  return await storeBlob({
    kind,
    buffer,
    filename: `${finalWidth}x${finalHeight}`,
    extraParts: [domain, `${finalWidth}x${finalHeight}`],
    contentType: contentType || undefined,
    extension: extension || undefined,
    cacheControl,
  });
}

export type BlobPruneResult = {
  deletedCount: number;
  errorCount: number;
};

/**
 * Drains due object keys from our purge queues and attempts deletion in R2.
 * Used by the Vercel cron job for blob cleanup.
 */
export async function pruneDueBlobsOnce(
  now: number,
  batch: number = 500,
): Promise<BlobPruneResult> {
  const { deleteObjects } = await import("@/lib/r2");
  const { ns, redis } = await import("@/lib/redis");
  const { StorageKindSchema } = await import("@/lib/schemas");

  let deletedCount = 0;
  let errorCount = 0;
  const alreadyFailed = new Set<string>();

  for (const kind of StorageKindSchema.options) {
    // Drain due items in batches per storage kind
    // Upstash supports zrange by score; the SDK exposes options for byScore/offset/count
    // Use a loop to progressively drain without pulling too many at once
    let offset = 0;
    while (true) {
      const dueRaw = (await redis.zrange(ns("purge", kind), 0, now, {
        byScore: true,
        offset,
        count: batch,
      })) as string[];
      if (!dueRaw.length) break;

      // Filter out paths that already failed during this run
      const due = dueRaw.filter((path) => !alreadyFailed.has(path));
      if (!due.length) {
        // All items in this batch already failed, advance to next window
        offset += dueRaw.length;
        if (dueRaw.length < batch) break; // Reached end of score range
        continue;
      }

      const succeeded: string[] = [];
      try {
        const result = await deleteObjects(due);
        const batchDeleted = result.filter((r) => r.deleted).map((r) => r.key);
        deletedCount += batchDeleted.length;
        succeeded.push(...batchDeleted);
        for (const r of result) {
          if (!r.deleted) {
            alreadyFailed.add(r.key);
            errorCount++;
          }
        }
      } catch {
        for (const path of due) {
          alreadyFailed.add(path);
          errorCount++;
        }
      }

      if (succeeded.length) await redis.zrem(ns("purge", kind), ...succeeded);
      // Avoid infinite loop when a full batch fails to delete (e.g., network or token issue)
      if (succeeded.length === 0 && due.length > 0) break;

      // Don't increment offset when items were removed (set shrunk); offset only advances
      // in the "all filtered" case above to skip over alreadyFailed items

      // Nothing more due right now
      if (dueRaw.length < batch) break;
    }
  }

  return { deletedCount, errorCount };
}
