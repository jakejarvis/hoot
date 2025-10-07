import { NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";
import { ns, redis } from "@/lib/redis";
import { StorageKindSchema } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET || null;
  const header = req.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const deleted: string[] = [];
  const errors: Array<{ path: string; error: string }> = [];
  const utapi = new UTApi();

  // Fixed batch size to avoid env coupling
  const batch = 500;
  const now = Date.now();

  for (const kind of StorageKindSchema.options) {
    // Drain due items in batches
    // Upstash supports zrange with byScore parameter; the SDK exposes zrange with options
    while (true) {
      const due = await redis.zrange<string[]>(ns("purge", kind), 0, now, {
        byScore: true,
        offset: 0,
        count: batch,
      });
      if (!due.length) break;
      const succeeded: string[] = [];
      try {
        // Delete by UploadThing file key (default behavior)
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
      // nothing more due right now
      if (due.length < batch) break;
    }
  }

  return NextResponse.json({
    deletedCount: deleted.length,
    errorsCount: errors.length,
  });
}
