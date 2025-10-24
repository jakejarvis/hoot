import type { Instrumentation } from "next";

// Conditionally register Node.js-specific instrumentation
export const register = async () => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import to avoid bundling Node.js code into Edge runtime
    const { logger } = await import("@/lib/logger");
    const log = logger({ module: "instrumentation" });

    // Process-level error hooks (Node only)
    process.on("uncaughtException", (err) =>
      log.error("uncaughtException", { err }),
    );
    process.on("unhandledRejection", (reason) =>
      log.error("unhandledRejection", {
        err: reason instanceof Error ? reason : new Error(String(reason)),
      }),
    );
  }
};

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      // Dynamic imports for Node.js-only code
      const { logger } = await import("@/lib/logger");
      const log = logger({ module: "instrumentation" });

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
            log.error("cookie.parse.error", { err: e });
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
      console.error("Instrumentation error", instrumentationError);
    }
  }
};
