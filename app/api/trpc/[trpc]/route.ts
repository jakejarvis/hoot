import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { logger } from "@/lib/logger";
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

      // Prefer formatted data from errorFormatter for consistent headers
      const data = (
        err as {
          data?: { retryAfter?: number; limit?: number; remaining?: number };
        }
      ).data;
      const retryAfter = Math.max(1, Math.round(Number(data?.retryAfter ?? 1)));
      const headers: Record<string, string> = {
        "Retry-After": String(retryAfter),
        "Cache-Control": "no-cache, no-store",
      };
      if (typeof data?.limit === "number")
        headers["X-RateLimit-Limit"] = String(data.limit);
      if (typeof data?.remaining === "number")
        headers["X-RateLimit-Remaining"] = String(data.remaining);

      return { headers, status: 429 };
    },
    onError: ({ path, error }) => {
      const log = logger({ module: "trpc:handler" });
      log.error("unhandled", { path, err: error });
    },
  });

export { handler as GET, handler as POST };
