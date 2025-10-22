import "server-only";
import { inngest } from "@/lib/inngest/client";
import { deleteObjects } from "@/lib/r2";
import { ns, redis } from "@/lib/redis";
import { StorageKindSchema } from "@/lib/schemas";

export type BlobPruneResult = {
  deleted: string[];
  errors: Array<{ path: string; error: string }>;
};

/**
 * Drains due object keys from our purge queues and attempts deletion in R2.
 * Exposed for tests and used by the Inngest function below.
 */
export async function pruneDueBlobsOnce(
  now: number,
  batch: number = 500,
): Promise<BlobPruneResult> {
  const deleted: string[] = [];
  const errors: Array<{ path: string; error: string }> = [];

  for (const kind of StorageKindSchema.options) {
    // Drain due items in batches per storage kind
    // Upstash supports zrange by score; the SDK exposes options for byScore/offset/count
    // Use a loop to progressively drain without pulling too many at once
    while (true) {
      const due = (await redis.zrange(ns("purge", kind), 0, now, {
        byScore: true,
        offset: 0,
        count: batch,
      })) as string[];
      if (!due.length) break;

      const succeeded: string[] = [];
      try {
        const result = await deleteObjects(due);
        const batchDeleted = result.filter((r) => r.deleted).map((r) => r.key);
        deleted.push(...batchDeleted);
        succeeded.push(...batchDeleted);
        for (const r of result) {
          if (!r.deleted) {
            errors.push({ path: r.key, error: r.error || "unknown" });
          }
        }
      } catch (err) {
        for (const path of due) {
          errors.push({ path, error: (err as Error)?.message || "unknown" });
        }
      }

      if (succeeded.length) await redis.zrem(ns("purge", kind), ...succeeded);
      // Avoid infinite loop when a full batch fails to delete (e.g., network or token issue)
      if (succeeded.length === 0 && due.length > 0) break;
      // Nothing more due right now
      if (due.length < batch) break;
    }
  }

  return { deleted, errors };
}

export const blobPrune = inngest.createFunction(
  { id: "blob-prune", concurrency: { limit: 1 } },
  // Mirror existing Vercel Cron cadence (03:00 daily)
  { cron: "0 3 * * *" },
  async ({ step, logger }) => {
    await step.run("prune-due-blobs", async () => {
      const startedAt = Date.now();
      logger.info("[blob-prune] starting prune cycle");
      const result = await pruneDueBlobsOnce(startedAt);
      const durationMs = Date.now() - startedAt;
      if (result.errors.length) {
        logger.warn("[blob-prune] completed with errors", {
          deletedCount: result.deleted.length,
          errorCount: result.errors.length,
          durationMs,
        });
      } else {
        logger.info("[blob-prune] completed", {
          deletedCount: result.deleted.length,
          durationMs,
        });
      }
      return {
        deletedCount: result.deleted.length,
        errorCount: result.errors.length,
        durationMs,
      };
    });
  },
);
