"use client";

import { Suspense } from "react";
import { CertificatesSection } from "@/components/domain/sections/certificates-section";
import { CertificatesSectionSkeleton } from "@/components/domain/skeletons";
import { useCertificatesQuery } from "@/hooks/use-domain-queries";

function CertificatesSectionContent({ domain }: { domain: string }) {
  const { data } = useCertificatesQuery(domain);
  return <CertificatesSection data={data} />;
}

export function CertificatesSectionWithData({ domain }: { domain: string }) {
  return (
    <Suspense fallback={<CertificatesSectionSkeleton />}>
      <CertificatesSectionContent domain={domain} />
    </Suspense>
  );
}
