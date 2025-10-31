"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { DomainLoadingState } from "@/components/domain/domain-loading-state";
import { DomainUnregisteredState } from "@/components/domain/domain-unregistered-state";
import { ExportButton } from "@/components/domain/export-button";
import { Favicon } from "@/components/domain/favicon";
import { ScreenshotTooltip } from "@/components/domain/screenshot-tooltip";
import { CertificatesSectionWithData } from "@/components/domain/sections-with-data/certificates-section-with-data";
import { DnsSectionWithData } from "@/components/domain/sections-with-data/dns-section-with-data";
import { HeadersSectionWithData } from "@/components/domain/sections-with-data/headers-section-with-data";
import { HostingSectionWithData } from "@/components/domain/sections-with-data/hosting-section-with-data";
import { RegistrationSectionWithData } from "@/components/domain/sections-with-data/registration-section-with-data";
import { SeoSectionWithData } from "@/components/domain/sections-with-data/seo-section-with-data";
import { ToolsDropdown } from "@/components/domain/tools-dropdown";
import { useDomainHistory } from "@/hooks/use-domain-history";
import { useRegistrationQuery } from "@/hooks/use-domain-queries";
import { captureClient } from "@/lib/analytics/client";
import { exportDomainData } from "@/lib/json-export";
import { useTRPC } from "@/lib/trpc/client";

/**
 * Inner content component - queries registration and conditionally shows sections.
 * This component suspends until registration data is ready.
 */
function DomainReportContent({ domain }: { domain: string }) {
  const { data: registration } = useRegistrationQuery(domain);
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const [allDataLoaded, setAllDataLoaded] = useState(false);

  // Show unregistered state if confirmed unregistered
  const isConfirmedUnregistered =
    registration.isRegistered === false && registration.source !== null;

  // Add to search history (only for registered domains)
  useDomainHistory(isConfirmedUnregistered ? "" : domain);

  // Memoize query keys to avoid repeated queryOptions calls
  const queryKeys = useMemo(
    () => ({
      registration: trpc.domain.registration.queryOptions({ domain }).queryKey,
      dns: trpc.domain.dns.queryOptions({ domain }).queryKey,
      hosting: trpc.domain.hosting.queryOptions({ domain }).queryKey,
      certificates: trpc.domain.certificates.queryOptions({ domain }).queryKey,
      headers: trpc.domain.headers.queryOptions({ domain }).queryKey,
      seo: trpc.domain.seo.queryOptions({ domain }).queryKey,
    }),
    [trpc, domain],
  );

  // Check if all section data is loaded in cache
  useEffect(() => {
    const hasAllData = Object.values(queryKeys).every(
      (key) => queryClient.getQueryData(key) !== undefined,
    );
    setAllDataLoaded(hasAllData);
  }, [queryClient, queryKeys]);

  if (isConfirmedUnregistered) {
    captureClient("unregistered_viewed", { domain });
    return <DomainUnregisteredState domain={domain} />;
  }

  captureClient("report_viewed", { domain });

  // Export handler that reads all data from React Query cache
  const handleExport = () => {
    captureClient("export_json_clicked", { domain });

    try {
      // Read data from cache using memoized query keys
      const registrationData = queryClient.getQueryData(queryKeys.registration);
      const dnsData = queryClient.getQueryData(queryKeys.dns);
      const hostingData = queryClient.getQueryData(queryKeys.hosting);
      const certificatesData = queryClient.getQueryData(queryKeys.certificates);
      const headersData = queryClient.getQueryData(queryKeys.headers);
      const seoData = queryClient.getQueryData(queryKeys.seo);

      // Aggregate into export format
      const exportData = {
        registration: registrationData ?? null,
        dns: dnsData ?? null,
        hosting: hostingData ?? null,
        certificates: certificatesData ?? null,
        headers: headersData ?? null,
        seo: seoData ?? null,
      };

      // Export with partial data (graceful degradation)
      exportDomainData(domain, exportData);
    } catch (error) {
      console.error("[export] failed to export domain data", error);
      captureClient("export_json_failed", {
        domain,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ScreenshotTooltip domain={domain}>
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2"
            onClick={() =>
              captureClient("external_domain_link_clicked", { domain })
            }
          >
            <Favicon domain={domain} size={20} className="rounded" />
            <h2 className="font-semibold text-xl tracking-tight">{domain}</h2>
            <ExternalLink
              className="size-3.5 text-muted-foreground/60"
              aria-hidden="true"
            />
          </a>
        </ScreenshotTooltip>

        <div className="flex items-center gap-2">
          <ExportButton
            onExportAction={handleExport}
            disabled={!allDataLoaded}
          />

          <ToolsDropdown domain={domain} />
        </div>
      </div>

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
