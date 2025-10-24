import type { Instrumentation } from "next";
import { logger } from "@/lib/logger";

// Process-level error hooks (Node only)
if (typeof process !== "undefined" && process?.on) {
  const log = logger();
  process.on("uncaughtException", (err) =>
    log.error("uncaughtException", { err }),
  );
  process.on("unhandledRejection", (reason) =>
    log.error("unhandledRejection", { err: reason }),
  );
}

const log = logger();

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { getServerPosthog } = await import("@/lib/analytics/server");
      const phClient = getServerPosthog();

      if (!phClient) {
        return; // PostHog not available, skip error tracking
      }

      let distinctId = null;
      if (request.headers.cookie) {
        const cookieString = request.headers.cookie;
        const postHogCookieMatch =
          typeof cookieString === "string"
            ? cookieString.match(/ph_phc_.*?_posthog=([^;]+)/)
            : null;

        if (postHogCookieMatch?.[1]) {
          try {
            const decodedCookie = decodeURIComponent(postHogCookieMatch[1]);
            const postHogData = JSON.parse(decodedCookie);
            distinctId = postHogData.distinct_id;
          } catch (e) {
            log.error("posthog.cookie.parse.error", { err: e });
          }
        }
      }

      phClient.captureException(err, distinctId || undefined, {
        path: request.path,
        method: request.method,
      });

      await phClient.shutdown();
    } catch (instrumentationError) {
      // Graceful degradation - log error but don't throw to avoid breaking the request
      log.error("instrumentation.error.tracking.failed", {
        err: instrumentationError,
      });
    }
  }
};
