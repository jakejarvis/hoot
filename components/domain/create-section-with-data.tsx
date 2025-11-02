"use client";

import type { ComponentType } from "react";
import { Suspense } from "react";
import { SectionErrorBoundary } from "@/components/domain/section-error-boundary";

interface QueryResult<TData> {
  data: TData;
}

type UseQueryHook<TData> = (domain: string) => QueryResult<TData>;

/**
 * Higher-order factory that creates a SectionWithData component
 * following the Suspense+query+render pattern with error boundary protection.
 *
 * @param useQuery - The query hook to fetch data (e.g., useHostingQuery)
 * @param Section - The presentational component to render with data
 * @param Skeleton - The skeleton component to show during loading
 * @param sectionName - Name of the section for error tracking (e.g., "Hosting", "DNS")
 * @param mapDataToProps - Optional function to map query data to Section props. Defaults to `(domain, data) => ({ domain, data })`
 * @returns A SectionWithData component that handles Suspense, data fetching, and error boundaries
 */
export function createSectionWithData<
  TData,
  TProps extends Record<string, unknown> = { domain: string; data: TData },
>(
  useQuery: UseQueryHook<TData>,
  Section: ComponentType<TProps>,
  Skeleton: ComponentType,
  sectionName: string,
  mapDataToProps?: (domain: string, data: TData) => TProps,
) {
  const defaultMapper = (domain: string, data: TData) =>
    ({ domain, data }) as unknown as TProps;

  const mapper = mapDataToProps ?? defaultMapper;

  function SectionContent({ domain }: { domain: string }) {
    const { data } = useQuery(domain);
    const props = mapper(domain, data);
    return <Section {...props} />;
  }

  function SectionWithData({ domain }: { domain: string }) {
    return (
      <SectionErrorBoundary sectionName={sectionName}>
        <Suspense fallback={<Skeleton />}>
          <SectionContent domain={domain} />
        </Suspense>
      </SectionErrorBoundary>
    );
  }

  return SectionWithData;
}
