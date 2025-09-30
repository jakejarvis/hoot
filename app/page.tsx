import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { DomainSearch } from "@/components/domain/domain-search";
import { HomeHero } from "@/components/home-hero";
import { DEFAULT_SUGGESTIONS } from "@/lib/constants";
import { getQueryClient } from "@/trpc/query-client";
import { trpc } from "@/trpc/server";

export const experimental_ppr = true;

export default function Home() {
  const queryClient = getQueryClient();

  DEFAULT_SUGGESTIONS.forEach((domain) => {
    void queryClient.prefetchQuery(
      trpc.domain.favicon.queryOptions({ domain }),
    );
  });

  return (
    <div className="container mx-auto my-auto flex items-center justify-center px-4 py-8">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <div className="w-full space-y-6">
          <HomeHero />

          <div className="w-full max-w-3xl mx-auto">
            <DomainSearch variant="lg" />
          </div>
        </div>
      </HydrationBoundary>
    </div>
  );
}
