"use client";

import type { ComponentType } from "react";
import { Suspense } from "react";

interface QueryResult<TData> {
  data: TData;
}

type UseQueryHook<TData> = (domain: string) => QueryResult<TData>;

interface SectionProps {
  [key: string]: unknown;
}

/**
 * Higher-order factory that creates a SectionWithData component
 * following the Suspense+query+render pattern.
 *
 * @param useQuery - The query hook to fetch data (e.g., useHostingQuery)
 * @param Section - The presentational component to render with data
 * @param Skeleton - The skeleton component to show during loading
 * @param mapDataToProps - Function to map query data to Section props
 * @returns A SectionWithData component that handles Suspense and data fetching
 */
export function createSectionWithData<TData, TProps extends SectionProps>(
  useQuery: UseQueryHook<TData>,
  Section: ComponentType<TProps>,
  Skeleton: ComponentType,
  mapDataToProps: (domain: string, data: TData) => TProps,
) {
  function SectionContent({ domain }: { domain: string }) {
    const { data } = useQuery(domain);
    const props = mapDataToProps(domain, data);
    return <Section {...props} />;
  }

  function SectionWithData({ domain }: { domain: string }) {
    return (
      <Suspense fallback={<Skeleton />}>
        <SectionContent domain={domain} />
      </Suspense>
    );
  }

  return SectionWithData;
}
