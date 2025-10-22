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
      const tooMany = errors.find((e) => e.code === "TOO_MANY_REQUESTS");
      if (tooMany) {
        const data = (tooMany as unknown as { data?: { retryAfter?: number } })
          .data;
        const retry = (data?.retryAfter ?? 1) as number;
        return { headers: { "Retry-After": String(retry) }, status: 429 };
      }
      return {};
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
