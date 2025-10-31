"use client";

import { Suspense } from "react";
import { DnsRecordsSection } from "@/components/domain/sections/dns-records-section";
import { DnsSectionSkeleton } from "@/components/domain/skeletons";
import { useDnsQuery } from "@/hooks/use-domain-queries";

function DnsSectionContent({ domain }: { domain: string }) {
  const { data } = useDnsQuery(domain);
  return <DnsRecordsSection records={data.records} />;
}

export function DnsSectionWithData({ domain }: { domain: string }) {
  return (
    <Suspense fallback={<DnsSectionSkeleton />}>
      <DnsSectionContent domain={domain} />
    </Suspense>
  );
}
