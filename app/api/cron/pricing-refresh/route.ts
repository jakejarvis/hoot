import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { refreshAllProviderPricing } from "@/server/services/pricing";

const log = logger({ module: "cron:pricing-refresh" });

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization");
  const expectedAuth = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;

  if (!expectedAuth) {
    log.error("cron.misconfigured", { reason: "CRON_SECRET missing" });
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  if (authHeader !== expectedAuth) {
    log.warn("cron.unauthorized", { provided: Boolean(authHeader) });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startedAt = Date.now();
    const result = await refreshAllProviderPricing();

    const durationMs = Date.now() - startedAt;
    if (result.failed.length > 0) {
      log.warn("completed.with.errors", {
        refreshed: result.refreshed,
        failed: result.failed,
        durationMs,
      });
    } else {
      log.info("completed", {
        refreshed: result.refreshed,
        durationMs,
      });
    }

    return NextResponse.json({
      success: true,
      refreshed: result.refreshed,
      failed: result.failed,
      durationMs,
    });
  } catch (err) {
    log.error("cron.failed", {
      err: err instanceof Error ? err : new Error(String(err)),
    });
    return NextResponse.json(
      {
        error: "Internal error",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }
}
