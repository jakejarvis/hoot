import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { DomainLoadingState } from "@/components/domain/domain-loading-state";
import { DomainReportView } from "@/components/domain/domain-report-view";
import { DomainSsrAnalytics } from "@/components/domain/domain-ssr-analytics";
import { normalizeDomainInput } from "@/lib/domain";
import { toRegistrableDomain } from "@/lib/domain-server";
import { makeQueryClient } from "@/trpc/query-client";
import { trpc } from "@/trpc/server";

import "country-flag-icons/3x2/flags.css";
import "mapbox-gl/dist/mapbox-gl.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain: raw } = await params;
  const decoded = decodeURIComponent(raw);
  const normalized = normalizeDomainInput(decoded);

  return {
    title: `${normalized} — Domain Report`,
    description: `Investigate ${normalized}'s WHOIS, DNS, SSL, headers, and more.`,
    alternates: {
      canonical: `/${normalized}`,
    },
  };
}

export default async function DomainPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  "use cache";

  const { domain: raw } = await params;
  const decoded = decodeURIComponent(raw);
  const normalized = normalizeDomainInput(decoded);

  const isRegistrable = toRegistrableDomain(normalized);
  if (!isRegistrable) notFound();

  // Canonicalize URL to the normalized domain (middleware should already handle most cases)
  if (normalized !== decoded) {
    redirect(`/${encodeURIComponent(normalized)}`);
  }

  // Minimal prefetch: registration only, let sections stream progressively
  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery(
    trpc.domain.registration.queryOptions({ domain: normalized }),
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      {/* Dynamic island: runs on server, reads cookie, captures analytics */}
      <DomainSsrAnalytics
        domain={normalized}
        canonicalized={normalized !== decoded}
      />

      <Suspense fallback={<DomainLoadingState />}>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <DomainReportView domain={normalized} />
        </HydrationBoundary>
      </Suspense>
    </div>
  );
}
