"use client";

import { Suspense } from "react";
import { HostingEmailSection } from "@/components/domain/sections/hosting-email-section";
import { HostingSectionSkeleton } from "@/components/domain/skeletons";
import { useHostingQuery } from "@/hooks/use-domain-queries";

function HostingSectionContent({ domain }: { domain: string }) {
  const { data } = useHostingQuery(domain);
  return <HostingEmailSection data={data} />;
}

export function HostingSectionWithData({ domain }: { domain: string }) {
  return (
    <Suspense fallback={<HostingSectionSkeleton />}>
      <HostingSectionContent domain={domain} />
    </Suspense>
  );
}
