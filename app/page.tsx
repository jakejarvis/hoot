import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { DomainSearch } from "@/components/domain/domain-search";
import { HomeHero } from "@/components/home-hero";
import { DEFAULT_SUGGESTIONS } from "@/lib/constants";
import { getQueryClient } from "@/trpc/query-client";
import { trpc } from "@/trpc/server";

export const experimental_ppr = true;

export default async function Home() {
  const queryClient = getQueryClient();

  await Promise.all(
    DEFAULT_SUGGESTIONS.map((domain) =>
      queryClient.prefetchQuery(
        trpc.domain.favicon.queryOptions(
          { domain },
          {
            staleTime: 60 * 60_000, // 1 hour
          },
        ),
      ),
    ),
  );

  return (
    <div className="container mx-auto my-auto flex items-center justify-center px-4 py-8">
      <div className="w-full space-y-6">
        <HomeHero />

        <div className="mx-auto w-full max-w-3xl">
          <HydrationBoundary state={dehydrate(queryClient)}>
            <DomainSearch variant="lg" />
          </HydrationBoundary>
        </div>
      </div>
    </div>
  );
}
