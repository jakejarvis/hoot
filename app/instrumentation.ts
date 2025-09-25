import type { Instrumentation } from "next";

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
            console.error("Error parsing PostHog cookie:", e);
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
      console.error(
        "Instrumentation error tracking failed:",
        instrumentationError,
      );
    }
  }
};
