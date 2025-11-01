"use client";

import { Suspense, useEffect } from "react";
import { DomainLoadingState } from "@/components/domain/domain-loading-state";
import { DomainReportHeader } from "@/components/domain/domain-report-header";
import { DomainUnregisteredState } from "@/components/domain/domain-unregistered-state";
import { CertificatesSectionWithData } from "@/components/domain/sections-with-data/certificates-section-with-data";
import { DnsSectionWithData } from "@/components/domain/sections-with-data/dns-section-with-data";
import { HeadersSectionWithData } from "@/components/domain/sections-with-data/headers-section-with-data";
import { HostingSectionWithData } from "@/components/domain/sections-with-data/hosting-section-with-data";
import { RegistrationSectionWithData } from "@/components/domain/sections-with-data/registration-section-with-data";
import { SeoSectionWithData } from "@/components/domain/sections-with-data/seo-section-with-data";
import { useDomainExport } from "@/hooks/use-domain-export";
import { useDomainHistory } from "@/hooks/use-domain-history";
import { useRegistrationQuery } from "@/hooks/use-domain-queries";
import { useDomainQueryKeys } from "@/hooks/use-domain-query-keys";
import { captureClient } from "@/lib/analytics/client";

/**
 * Inner content component - queries registration and conditionally shows sections.
 * This component suspends until registration data is ready.
 */
function DomainReportContent({ domain }: { domain: string }) {
  const { data: registration } = useRegistrationQuery(domain);

  // Show unregistered state if confirmed unregistered
  const isConfirmedUnregistered =
    registration.isRegistered === false && registration.source !== null;

  // Add to search history (only for registered domains)
  useDomainHistory(isConfirmedUnregistered ? "" : domain);

  // Capture analytics event when registration state resolves
  useEffect(() => {
    if (isConfirmedUnregistered) {
      captureClient("unregistered_viewed", { domain });
    } else {
      captureClient("report_viewed", { domain });
    }
  }, [domain, isConfirmedUnregistered]);

  // Get memoized query keys for all sections
  const queryKeys = useDomainQueryKeys(domain);

  // Track export state and get export handler
  const { handleExport, allDataLoaded } = useDomainExport(domain, queryKeys);

  if (isConfirmedUnregistered) {
    return <DomainUnregisteredState domain={domain} />;
  }

  return (
    <div className="space-y-4">
      <DomainReportHeader
        domain={domain}
        onExport={handleExport}
        exportDisabled={!allDataLoaded}
      />

      <div className="space-y-4">
        <RegistrationSectionWithData domain={domain} />
        <HostingSectionWithData domain={domain} />
        <DnsSectionWithData domain={domain} />
        <CertificatesSectionWithData domain={domain} />
        <HeadersSectionWithData domain={domain} />
        <SeoSectionWithData domain={domain} />
      </div>
    </div>
  );
}

export function DomainReportView({ domain }: { domain: string }) {
  return (
    <Suspense fallback={<DomainLoadingState />}>
      <DomainReportContent domain={domain} />
    </Suspense>
  );
}
