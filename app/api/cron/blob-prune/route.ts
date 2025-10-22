import { NextResponse } from "next/server";
import { pruneDueBlobsOnce } from "@/lib/storage";

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

    if (result.errors.length > 0) {
      console.warn("[blob-prune] completed with errors", {
        deletedCount: result.deleted.length,
        errorCount: result.errors.length,
        duration_ms: Date.now() - startedAt,
      });
    } else {
      console.info("[blob-prune] completed", {
        deletedCount: result.deleted.length,
        duration_ms: Date.now() - startedAt,
      });
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.deleted.length,
      errorCount: result.errors.length,
      duration_ms: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[blob-prune] cron failed", error);
    return NextResponse.json(
      {
        error: "Internal error",
        message: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
