import { NextResponse } from "next/server";
import { refreshAllProviderPricing } from "@/server/services/pricing";

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization");
  const expectedAuth = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;

  if (!expectedAuth) {
    console.error("[pricing-refresh] cron misconfigured: CRON_SECRET missing");
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  if (authHeader !== expectedAuth) {
    console.warn("[pricing-refresh] cron unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startedAt = Date.now();
    const result = await refreshAllProviderPricing();

    const durationMs = Date.now() - startedAt;
    if (result.failed.length > 0) {
      console.warn(
        `[pricing-refresh] completed with errors: refreshed=${result.refreshed.length} failed=${result.failed.length} ${durationMs}ms`,
      );
    } else {
      console.info(
        `[pricing-refresh] completed: refreshed=${result.refreshed.length} ${durationMs}ms`,
      );
    }

    return NextResponse.json({
      success: true,
      refreshed: result.refreshed,
      failed: result.failed,
      durationMs,
    });
  } catch (err) {
    console.error(
      "[pricing-refresh] cron failed",
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
