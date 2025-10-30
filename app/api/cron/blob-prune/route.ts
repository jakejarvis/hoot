import { NextResponse } from "next/server";
import { pruneDueBlobsOnce } from "@/lib/storage";

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization");
  const expectedAuth = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;

  if (!expectedAuth) {
    console.error("[blob-prune] cron misconfigured: CRON_SECRET missing");
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  if (authHeader !== expectedAuth) {
    console.warn("[blob-prune] cron unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startedAt = Date.now();
    const result = await pruneDueBlobsOnce(startedAt);

    const durationMs = Date.now() - startedAt;
    if (result.errorCount > 0) {
      console.warn(
        `[blob-prune] completed with errors: deleted=${result.deletedCount} errors=${result.errorCount} ${durationMs}ms`,
      );
    } else {
      console.info(
        `[blob-prune] completed: deleted=${result.deletedCount} ${durationMs}ms`,
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      errorCount: result.errorCount,
      durationMs,
    });
  } catch (err) {
    console.error(
      "[blob-prune] cron failed",
      err instanceof Error ? err : new Error(String(err)),
    );
    return NextResponse.json(
      {
        error: "Internal error",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }
}
