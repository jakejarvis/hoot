import { NextResponse } from "next/server";
import { cleanupOrphanedQueueEntries } from "@/lib/schedule";

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
    const result = await cleanupOrphanedQueueEntries();

    console.info(
      `[queue-cleanup] ok removed=${result.removed} checked=${result.checked} ${Date.now() - startedAt}ms`,
    );

    return NextResponse.json({
      success: true,
      removed: result.removed,
      checked: result.checked,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    console.error(
      "[queue-cleanup] cron failed",
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
