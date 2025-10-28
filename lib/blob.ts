import "server-only";

import { del, put } from "@vercel/blob";
import { logger } from "@/lib/logger";

const log = logger({ module: "blob" });

/**
 * Upload a buffer to Vercel Blob storage
 */
export async function putBlob(options: {
  pathname: string;
  body: Buffer;
  contentType?: string;
  cacheControlMaxAge?: number;
}): Promise<{ url: string; pathname: string }> {
  const blob = await put(options.pathname, options.body, {
    access: "public",
    contentType: options.contentType,
    cacheControlMaxAge: options.cacheControlMaxAge,
  });

  return {
    url: blob.url,
    pathname: options.pathname,
  };
}

export type DeleteResult = Array<{
  url: string;
  deleted: boolean;
  error?: string;
}>;

/**
 * Delete one or more blobs by URL
 */
export async function deleteBlobs(urls: string[]): Promise<DeleteResult> {
  const results: DeleteResult = [];
  if (!urls.length) return results;

  // Vercel Blob's del() can handle multiple URLs at once
  // but we process in batches for safety and to track individual failures
  const BATCH_SIZE = 100;

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    try {
      await del(batch);
      // If del() succeeds, all were deleted
      for (const url of batch) {
        results.push({ url, deleted: true });
      }
    } catch (err) {
      const message = (err as Error)?.message || "unknown";
      log.error("deleteBlobs.failed", {
        urls: batch,
        err,
      });
      // If batch fails, mark all as failed
      for (const url of batch) {
        results.push({ url, deleted: false, error: message });
      }
    }
  }

  return results;
}
