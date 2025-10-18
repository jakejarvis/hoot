import "server-only";
import { UTApi } from "uploadthing/server";
import { ns, redis } from "@/lib/redis";
import { StorageKindSchema } from "@/lib/schemas";
import { inngest } from "@/server/inngest/client";

export type BlobPruneResult = {
  deleted: string[];
  errors: Array<{ path: string; error: string }>;
};

/**
 * Drains due UploadThing file keys from our purge queues and attempts deletion.
 * Exposed for tests and used by the Inngest function below.
 */
export async function pruneDueBlobsOnce(
  now: number,
  batch: number = 500,
): Promise<BlobPruneResult> {
  const deleted: string[] = [];
  const errors: Array<{ path: string; error: string }> = [];
  const utapi = new UTApi();

  for (const kind of StorageKindSchema.options) {
    // Drain due items in batches per storage kind
    // Upstash supports zrange by score; the SDK exposes options for byScore/offset/count
    // Use a loop to progressively drain without pulling too many at once
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const due = await redis.zrange<string[]>(ns("purge", kind), 0, now, {
        byScore: true,
        offset: 0,
        count: batch,
      });
      if (!due.length) break;

      const succeeded: string[] = [];
      try {
        await utapi.deleteFiles(due);
        deleted.push(...due);
        succeeded.push(...due);
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
  async ({ step }) => {
    await step.run("prune-due-blobs", async () => {
      await pruneDueBlobsOnce(Date.now());
    });
  },
);
