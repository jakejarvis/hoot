import "server-only";

import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { appRouter } from "@/server/routers/_app";
import { createContext } from "@/trpc/init";
import { makeQueryClient } from "@/trpc/query-client";

// Strongly-typed tRPC proxy for server-side prefetching via queryOptions
export const trpc = createTRPCOptionsProxy({
  ctx: createContext,
  router: appRouter,
  queryClient: makeQueryClient,
});
