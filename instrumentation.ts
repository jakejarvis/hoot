import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { captureServerException, getDistinctId } = await import(
        "@/lib/analytics/server"
      );

      const distinctId = await getDistinctId();
      await captureServerException(
        err as Error,
        {
          path: request.path,
          method: request.method,
        },
        distinctId ?? "",
      );
    } catch (instrumentationError) {
      // Graceful degradation - log error but don't throw to avoid breaking the request
      console.error(
        "Instrumentation error tracking failed:",
        instrumentationError,
      );
    }
  }
};
