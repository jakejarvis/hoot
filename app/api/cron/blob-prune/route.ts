import { NextResponse } from "next/server";
import { getFaviconBucket, getScreenshotBucket } from "@/lib/blob";
import { cacheDel, cacheGet, ns } from "@/lib/redis";
import { getStorageAdapter } from "@/lib/storage";

export const runtime = "nodejs";

function getCronSecret(): string | null {
  return process.env.CRON_SECRET || null;
}

function parseIntEnv(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

// Keep last N buckets for safety
const KEEP_BUCKETS = () => parseIntEnv("BLOB_KEEP_BUCKETS", 2);

/**
 * We prune old time-bucketed assets under `favicons/` and `screenshots/`.
 * Paths are structured as: `${kind}/${bucket}/${digest}/...`.
 */
// Removed old shouldDeletePath; deletion now uses Redis bucket sets

export async function GET(req: Request) {
  const secret = getCronSecret();
  const header = req.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const keep = KEEP_BUCKETS();
  // Compute current bucket per kind using the same helpers as blob paths
  const faviconBucket = getFaviconBucket();
  const screenshotBucket = getScreenshotBucket();

  const deleted: string[] = [];
  const errors: Array<{ path: string; error: string }> = [];

  type Kind = "icon" | "screenshot";
  const adapter = getStorageAdapter();

  function bucketSetKey(kind: Kind, bucket: number): string {
    return ns(`${kind}:bucket`, String(bucket));
  }

  function shouldDeleteBucket(kind: Kind, bucket: number): boolean {
    const current = kind === "icon" ? faviconBucket : screenshotBucket;
    return bucket <= current - keep;
  }

  for (const kind of ["icon", "screenshot"] as const) {
    const current = kind === "icon" ? faviconBucket : screenshotBucket;
    const doomed: number[] = [];
    for (let b = 0; b <= current - keep; b++) doomed.push(b);

    for (const bucket of doomed) {
      if (!shouldDeleteBucket(kind, bucket)) continue;
      try {
        const setKey = bucketSetKey(kind, bucket);
        const entries =
          (await cacheGet<{ providerKey: string; indexKey: string }[]>(
            setKey,
          )) || [];
        if (entries.length === 0) continue;
        const keys = entries.map((e) => e.providerKey);
        await adapter.deleteByKeys(keys);
        // Remove index keys and the bucket set
        for (const e of entries) {
          await cacheDel(e.indexKey);
          deleted.push(e.indexKey);
        }
        await cacheDel(setKey);
      } catch (err) {
        errors.push({
          path: `${kind}:${bucket}`,
          error: (err as Error)?.message || "unknown",
        });
      }
    }
  }

  return NextResponse.json({
    deletedCount: deleted.length,
    errorsCount: errors.length,
  });
}
