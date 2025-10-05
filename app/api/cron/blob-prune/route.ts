import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { ns, redis } from "@/lib/redis";

export const runtime = "nodejs";

function getCronSecret(): string | null {
  return process.env.CRON_SECRET || null;
}

function parseIntEnv(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

const BATCH = () => parseIntEnv("BLOB_PURGE_BATCH", 500);

export async function GET(req: Request) {
  const secret = getCronSecret();
  const header = req.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const deleted: string[] = [];
  const errors: Array<{ path: string; error: string }> = [];

  const batch = BATCH();
  const now = Date.now();
  for (const kind of ["favicon", "screenshot"]) {
    // Drain due items in batches
    // Upstash supports zrange with byScore parameter; the SDK exposes zrange with options
    // Fallback: use zrangebyscore when available; here we emulate via zrange with byScore
    while (true) {
      const due = (await (
        redis as unknown as {
          zrange: (
            key: string,
            min: number,
            max: number,
            options: {
              byScore: true;
              limit?: { offset: number; count: number };
            },
          ) => Promise<string[]>;
        }
      ).zrange(ns("purge", kind), 0, now, {
        byScore: true,
        limit: { offset: 0, count: batch },
      })) as string[];
      if (!due.length) break;
      for (const path of due) {
        try {
          await del(path, { token: process.env.BLOB_READ_WRITE_TOKEN });
          deleted.push(path);
        } catch (err) {
          errors.push({ path, error: (err as Error)?.message || "unknown" });
        }
      }
      await redis.zrem(ns("purge", kind), ...due);
      if (due.length < batch) break; // nothing more due right now
    }
  }

  return NextResponse.json({
    deletedCount: deleted.length,
    errorsCount: errors.length,
  });
}
