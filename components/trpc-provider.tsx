"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createTRPCClient,
  httpBatchStreamLink,
  loggerLink,
} from "@trpc/client";
import * as React from "react";
import superjson from "superjson";
import { TRPCProvider as Provider } from "@/lib/trpc/client";
import type { AppRouter } from "@/server/routers/_app";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 10 * 60 * 1000, // 10 minutes
            gcTime: 60 * 60 * 1000, // keep cache for 1 hour
            refetchOnMount: false,
            refetchOnReconnect: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  const [trpcClient] = React.useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchStreamLink({
          url: "/api/trpc",
          transformer: superjson,
          headers: async () => {
            try {
              const mod = await import("posthog-js");
              const ph = (mod.default ?? mod) as unknown;
              const getDistinct = (
                ph as { get_distinct_id?: () => string | undefined }
              ).get_distinct_id;
              const getSession = (
                ph as { get_session_id?: () => string | undefined }
              ).get_session_id;
              const distinctId =
                typeof getDistinct === "function" ? getDistinct() : undefined;
              const sessionId =
                typeof getSession === "function" ? getSession() : undefined;
              const headers: Record<string, string> = {};
              if (distinctId) headers["x-posthog-distinct-id"] = distinctId;
              if (sessionId) headers["x-posthog-session-id"] = sessionId;
              return headers;
            } catch {
              return {} as Record<string, string>;
            }
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Provider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </Provider>
    </QueryClientProvider>
  );
}
