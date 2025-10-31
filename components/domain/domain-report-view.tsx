"use client";

import { ExternalLink } from "lucide-react";
import { Suspense } from "react";
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

  if (isConfirmedUnregistered) {
    captureClient("unregistered_viewed", { domain });
    return <DomainUnregisteredState domain={domain} />;
  }

  captureClient("report_viewed", { domain });

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
            disabled={false}
            onExportAction={() => {
              captureClient("export_json_clicked", { domain });
              // Export functionality will be handled at a higher level or removed
              // since we don't have all data available here anymore
            }}
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
