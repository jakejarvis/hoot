import { NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { logger } from "@/lib/logger";
import { ns, redis } from "@/lib/redis";
import { drainDueDomainsOnce } from "@/lib/schedule";

const log = logger({ module: "cron:due-drain" });

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
    const result = await drainDueDomainsOnce();

    if (result.events.length === 0) {
      return NextResponse.json({
        success: true,
        emitted: 0,
        groups: 0,
        message: "nothing due",
      });
    }

    // Send events to Inngest in batches to respect any limits
    const BATCH_SIZE = 200;
    let emitted = 0;

    for (let i = 0; i < result.events.length; i += BATCH_SIZE) {
      const chunk = result.events.slice(i, i + BATCH_SIZE);
      await inngest.send(chunk);
      // Best-effort cleanup: remove drained domains; ignore failures
      try {
        await Promise.all(
          chunk.flatMap((e) =>
            e.data.sections.map((s) => redis.zrem(ns("due", s), e.data.domain)),
          ),
        );
      } catch (e) {
        log.warn("cleanup.failed", { err: e });
      }
      emitted += chunk.length;
    }

    log.info("cron.ok", {
      emitted,
      groups: result.groups,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      emitted,
      groups: result.groups,
      durationMs: Date.now() - startedAt,
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
