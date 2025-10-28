import "server-only";

import { createHmac } from "node:crypto";
import { putBlob } from "@/lib/blob";
import { logger } from "@/lib/logger";
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

function makeBlobPathname(
  kind: StorageKind,
  filename: string,
  extension = "bin",
  extraParts: Array<string | number>,
): string {
  const base = `${kind}:${extraParts.join(":")}`;
  const digest = deterministicHash(base);
  return `${digest}/${filename}.${extension}`;
}

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
 * Upload buffer to Vercel Blob with retry logic and exponential backoff
 */
async function uploadWithRetry(
  pathname: string,
  buffer: Buffer,
  contentType: string,
  cacheControlMaxAge?: number,
  maxAttempts = UPLOAD_MAX_ATTEMPTS,
): Promise<{ url: string; pathname: string }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      log.debug("upload.attempt", {
        pathname,
        attempt: attempt + 1,
        maxAttempts,
      });

      const result = await putBlob({
        pathname,
        body: buffer,
        contentType,
        cacheControlMaxAge,
      });

      log.info("upload.ok", {
        pathname,
        url: result.url,
        attempt: attempt + 1,
      });

      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      log.warn("upload.attempt.failed", {
        pathname,
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
          pathname,
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
  pathname?: string;
  contentType?: string;
  extension?: string;
  filename?: string;
  extraParts?: Array<string | number>;
  cacheControlMaxAge?: number;
}): Promise<{ url: string; pathname: string }> {
  const {
    kind,
    buffer,
    pathname: providedPathname,
    contentType: providedCt,
    extension: providedExt,
    filename: providedFilename,
    extraParts = [],
    cacheControlMaxAge,
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

  const pathname =
    providedPathname || makeBlobPathname(kind, filename, extension, extraParts);
  const result = await uploadWithRetry(
    pathname,
    buffer,
    contentType,
    cacheControlMaxAge,
  );
  return result;
}

export async function storeImage(options: {
  kind: StorageKind;
  domain: string;
  buffer: Buffer;
  width?: number;
  height?: number;
  contentType?: string;
  extension?: string;
  cacheControlMaxAge?: number;
}): Promise<{ url: string; pathname: string }> {
  const {
    kind,
    domain,
    buffer,
    width: providedW,
    height: providedH,
    contentType,
    extension,
    cacheControlMaxAge,
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
    cacheControlMaxAge,
  });
}

export type BlobPruneResult = {
  deletedCount: number;
  errorCount: number;
};

/**
 * Drains due blob URLs from our purge queues and attempts deletion in Vercel Blob.
 * Used by the Vercel cron job for blob cleanup.
 */
export async function pruneDueBlobsOnce(
  now: number,
  batch: number = 500,
): Promise<BlobPruneResult> {
  const { deleteBlobs } = await import("@/lib/blob");
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

      // Filter out URLs that already failed during this run
      const due = dueRaw.filter((url) => !alreadyFailed.has(url));
      if (!due.length) {
        // All items in this batch already failed, advance to next window
        offset += dueRaw.length;
        if (dueRaw.length < batch) break; // Reached end of score range
        continue;
      }

      const succeeded: string[] = [];
      try {
        const result = await deleteBlobs(due);
        const batchDeleted = result.filter((r) => r.deleted).map((r) => r.url);
        deletedCount += batchDeleted.length;
        succeeded.push(...batchDeleted);
        for (const r of result) {
          if (!r.deleted) {
            alreadyFailed.add(r.url);
            errorCount++;
          }
        }
      } catch {
        for (const url of due) {
          alreadyFailed.add(url);
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
