import { del, list } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getFaviconBucket, getScreenshotBucket } from "@/lib/blob";

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
function shouldDeletePath(
  pathname: string,
  currentBucket: number,
  keep: number,
) {
  // Expect: kind/bucket/...
  const parts = pathname.split("/");
  if (parts.length < 3) return false;
  const bucketNum = Number(parts[1]);
  if (!Number.isFinite(bucketNum)) return false;
  return bucketNum <= currentBucket - keep;
}

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

  // List favicons and screenshots prefixes separately to reduce listing size
  for (const prefix of ["favicons/", "screenshots/"]) {
    // Paginate list in case of many objects
    let cursor: string | undefined;
    do {
      const res = await list({
        prefix,
        cursor,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      cursor = res.cursor || undefined;
      for (const item of res.blobs) {
        const current = prefix.startsWith("favicons/")
          ? faviconBucket
          : screenshotBucket;
        if (shouldDeletePath(item.pathname, current, keep)) {
          try {
            await del(item.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
            deleted.push(item.pathname);
          } catch (err) {
            errors.push({
              path: item.pathname,
              error: (err as Error)?.message || "unknown",
            });
          }
        }
      }
    } while (cursor);
  }

  return NextResponse.json({
    deletedCount: deleted.length,
    errorsCount: errors.length,
  });
}
