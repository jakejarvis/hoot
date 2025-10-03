"use client";

import { ExternalLink, FileJson2 } from "lucide-react";
import Link from "next/link";
import { DomainLoadingState } from "@/components/domain/domain-loading-state";
import { DomainUnregisteredState } from "@/components/domain/domain-unregistered-state";
import { exportDomainData } from "@/components/domain/export-data";
import { Favicon } from "@/components/domain/favicon";
import { ScreenshotTooltip } from "@/components/domain/screenshot-tooltip";
import { CertificatesSection } from "@/components/domain/sections/certificates-section";
import { DnsRecordsSection } from "@/components/domain/sections/dns-records-section";
import { HeadersSection } from "@/components/domain/sections/headers-section";
import { HostingEmailSection } from "@/components/domain/sections/hosting-email-section";
import { RegistrationSection } from "@/components/domain/sections/registration-section";
import { Button } from "@/components/ui/button";
import { useDomainHistory } from "@/hooks/use-domain-history";
import { useDomainQueries } from "@/hooks/use-domain-queries";
import { captureClient } from "@/lib/analytics/client";
// no longer need SECTION_SLUGS now that accordions are removed

export function DomainReportView({ domain }: { domain: string }) {
  const { registration, dns, hosting, certs, headers } =
    useDomainQueries(domain);
  // TTLs are always shown now; preference removed

  // Manage domain history
  useDomainHistory(
    domain,
    registration.isSuccess,
    registration.data?.isRegistered ?? false,
  );

  // Disable export until all sections are settled (loaded or errored)
  const areSecondarySectionsLoading =
    registration.data?.isRegistered &&
    (dns.isLoading ||
      hosting.isLoading ||
      certs.isLoading ||
      headers.isLoading ||
      dns.isFetching ||
      hosting.isFetching ||
      certs.isFetching ||
      headers.isFetching);

  const handleExportJson = () => {
    captureClient("export_json_clicked", { domain });
    exportDomainData(domain, {
      registration: registration.data,
      dns: dns.data,
      hosting: hosting.data,
      certificates: certs.data,
      headers: headers.data,
    });
  };

  // Show loading state until WHOIS completes
  if (registration.isLoading) {
    return <DomainLoadingState />;
  }

  // Show unregistered state if domain is not registered
  const isUnregistered =
    registration.isSuccess && registration.data?.isRegistered === false;
  if (isUnregistered) {
    captureClient("report_unregistered_viewed", { domain });
    return <DomainUnregisteredState domain={domain} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <ScreenshotTooltip domain={domain}>
            <Link
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
            </Link>
          </ScreenshotTooltip>
        </div>
        <div>
          <Button
            variant="outline"
            onClick={handleExportJson}
            disabled={areSecondarySectionsLoading}
          >
            <FileJson2 />
            Export JSON
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <RegistrationSection
          data={registration.data || null}
          isLoading={registration.isLoading}
          isError={!!registration.isError}
          onRetryAction={() => {
            captureClient("section_refetch_clicked", {
              domain,
              section: "registration",
            });
            registration.refetch();
          }}
        />

        <HostingEmailSection
          data={hosting.data || null}
          isLoading={hosting.isLoading}
          isError={!!hosting.isError}
          onRetryAction={() => {
            captureClient("section_refetch_clicked", {
              domain,
              section: "hosting",
            });
            hosting.refetch();
          }}
        />

        <DnsRecordsSection
          records={dns.data?.records || null}
          isLoading={dns.isLoading}
          isError={!!dns.isError}
          onRetryAction={() => {
            captureClient("section_refetch_clicked", {
              domain,
              section: "dns",
            });
            dns.refetch();
          }}
        />

        <CertificatesSection
          data={certs.data || null}
          isLoading={certs.isLoading}
          isError={!!certs.isError}
          onRetryAction={() => {
            captureClient("section_refetch_clicked", {
              domain,
              section: "certificates",
            });
            certs.refetch();
          }}
        />

        <HeadersSection
          data={headers.data || null}
          isLoading={headers.isLoading}
          isError={!!headers.isError}
          onRetryAction={() => {
            captureClient("section_refetch_clicked", {
              domain,
              section: "headers",
            });
            headers.refetch();
          }}
        />
      </div>
    </div>
  );
}
