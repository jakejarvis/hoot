import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers/_app";
import { createContext } from "@/trpc/init";

export const runtime = "nodejs";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
    responseMeta: ({ errors }) => {
      const err = errors.find((e) => e.code === "TOO_MANY_REQUESTS");
      if (!err) return {};

      const cause = (
        err as {
          cause?: { retryAfter?: number; limit?: number; remaining?: number };
        }
      ).cause;

      const retryAfter = Math.max(
        1,
        Math.round(Number(cause?.retryAfter ?? 1)),
      );
      const headers: Record<string, string> = {
        "Retry-After": String(retryAfter),
        "Cache-Control": "no-cache, no-store",
      };
      if (typeof cause?.limit === "number")
        headers["X-RateLimit-Limit"] = String(cause.limit);
      if (typeof cause?.remaining === "number")
        headers["X-RateLimit-Remaining"] = String(cause.remaining);

      return { headers, status: 429 };
    },
    onError: ({ path, error }) => {
      // Development logging
      if (process.env.NODE_ENV === "development") {
        console.error(
          `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
        );
      }
    },
  });

export { handler as GET, handler as POST };
