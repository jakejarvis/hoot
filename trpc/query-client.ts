import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import { cache } from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Avoid immediate client refetch after hydration
        staleTime: 60 * 1000,
      },
      dehydrate: {
        // Include pending queries so streaming works smoothly
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
        // Do not redact errors on the server; Next.js handles error redaction/digests
        shouldRedactErrors: () => false,
      },
    },
  });
}

// Stable per-request QueryClient
export const getQueryClient = cache(makeQueryClient);
