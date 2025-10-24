import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { pruneDueBlobsOnce } from "@/lib/storage";

const log = logger({ module: "cron:blob-prune" });

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization");
  const expectedAuth = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;

  if (!expectedAuth) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startedAt = Date.now();
    const result = await pruneDueBlobsOnce(startedAt);

    if (result.errorCount > 0) {
      log.warn("completed.with.errors", {
        deletedCount: result.deletedCount,
        errorCount: result.errorCount,
        duration_ms: Date.now() - startedAt,
      });
    } else {
      log.info("completed", {
        deletedCount: result.deletedCount,
        duration_ms: Date.now() - startedAt,
      });
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      errorCount: result.errorCount,
      duration_ms: Date.now() - startedAt,
    });
  } catch (error) {
    log.error("cron.failed", { err: error });
    return NextResponse.json(
      {
        error: "Internal error",
        message: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
