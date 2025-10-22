"use client";

import { isServer, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createTRPCClient,
  httpBatchStreamLink,
  loggerLink,
  TRPCClientError,
} from "@trpc/client";
import { Siren } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import superjson from "superjson";
import { TRPCProvider as Provider } from "@/lib/trpc/client";
import type { AppRouter } from "@/server/routers/_app";
import { getQueryClient } from "@/trpc/query-client";

let browserQueryClient: ReturnType<typeof getQueryClient> | undefined;

function getStableQueryClient() {
  if (isServer) return getQueryClient();
  if (!browserQueryClient) browserQueryClient = getQueryClient();
  return browserQueryClient;
}

const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
  return `http://localhost:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
};

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getStableQueryClient();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: (opts) => {
            const shouldLog =
              process.env.NODE_ENV === "development" ||
              (opts.direction === "down" && opts.result instanceof Error);

            // Show a friendly toast for rate-limit errors (standardized cause)
            if (
              opts.direction === "down" &&
              opts.result instanceof TRPCClientError
            ) {
              const err = opts.result as TRPCClientError<AppRouter>;
              const cause = err.cause as
                | { code?: string; retryAfter?: number; service?: string }
                | undefined;
              if (cause?.code === "TOO_MANY_REQUESTS") {
                const retryAfterSec = Math.max(
                  1,
                  Math.round(Number(cause.retryAfter ?? 1)),
                );
                const service = cause.service;
                const friendly = formatWait(retryAfterSec);
                const title = service
                  ? `Too many ${service} requests`
                  : "You're doing that too much";
                toast.error(title, {
                  id: "rate-limit",
                  description: `Try again in ${friendly}.`,
                  icon: <Siren className="h-4 w-4" />,
                  position: "top-center",
                });
              }
            }

            return shouldLog;
          },
        }),
        httpBatchStreamLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
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

function formatWait(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 1) return "a moment";
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m <= 0) return `${sec}s`;
  if (m < 60) return sec ? `${m}m ${sec}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}
