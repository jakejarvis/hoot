import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { captureServerException } from "@/lib/analytics/server";
import { appRouter } from "@/server/routers/_app";
import { createContext } from "@/trpc/init";

export const runtime = "nodejs";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
    onError: ({ path, error, type, input }) => {
      // Development logging
      if (process.env.NODE_ENV === "development") {
        console.error(
          `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
        );
      }

      // Track all tRPC errors with PostHog
      captureServerException(error, {
        context: "trpc_error",
        procedure_type: type,
        procedure_path: path,
        input: input,
        error_code: error.code,
      });
    },
  });

export { handler as GET, handler as POST };
