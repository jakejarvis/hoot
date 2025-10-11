"use client";

import { Download, ExternalLink } from "lucide-react";
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
import { SeoSection } from "@/components/domain/sections/seo-section";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDomainHistory } from "@/hooks/use-domain-history";
import { useDomainQueries } from "@/hooks/use-domain-queries";
import { captureClient } from "@/lib/analytics/client";
// no longer need SECTION_SLUGS now that accordions are removed

export function DomainReportView({ domain }: { domain: string }) {
  const { registration, dns, hosting, certs, headers, seo } =
    useDomainQueries(domain);
  // TTLs are always shown now; preference removed

  // Manage domain history
  useDomainHistory(
    domain,
    registration.isSuccess,
    registration.data?.isRegistered ?? false,
  );

  // Consider sections "settled" only when they have either succeeded or errored.
  // This avoids showing empty states before a query has actually completed
  // (including while a query is disabled/pending due to gating conditions).
  const dnsSettled = !!(dns.isSuccess || dns.isError || dns.data !== undefined);
  const hostingSettled = !!(
    hosting.isSuccess ||
    hosting.isError ||
    hosting.data !== undefined
  );
  const certsSettled = !!(
    certs.isSuccess ||
    certs.isError ||
    certs.data !== undefined
  );
  const headersSettled = !!(
    headers.isSuccess ||
    headers.isError ||
    headers.data !== undefined
  );
  const seoSettled = !!(seo.isSuccess || seo.isError || seo.data !== undefined);

  // Disable export until all secondary sections are settled
  const areSecondarySectionsLoading =
    !!registration.data?.isRegistered &&
    !(
      dnsSettled &&
      hostingSettled &&
      certsSettled &&
      headersSettled &&
      seoSettled
    );

  const handleExportJson = () => {
    captureClient("export_json_clicked", { domain });
    exportDomainData(domain, {
      registration: registration.data,
      dns: dns.data,
      hosting: hosting.data,
      certificates: certs.data,
      headers: headers.data,
      seo: seo.data,
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
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={handleExportJson}
              disabled={areSecondarySectionsLoading}
            >
              <Download />
              <span className="hidden sm:inline-block">Export</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>
              Save this report as a <span className="font-mono">JSON</span>{" "}
              file.
            </p>
          </TooltipContent>
        </Tooltip>
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
          isLoading={!hostingSettled}
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
          isLoading={!dnsSettled}
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
          isLoading={!certsSettled}
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
          isLoading={!headersSettled}
          isError={!!headers.isError}
          onRetryAction={() => {
            captureClient("section_refetch_clicked", {
              domain,
              section: "headers",
            });
            headers.refetch();
          }}
        />

        <SeoSection
          data={seo.data || null}
          isLoading={!seoSettled}
          isError={!!seo.isError}
          onRetryAction={() => {
            captureClient("section_refetch_clicked", {
              domain,
              section: "seo",
            });
            seo.refetch();
          }}
        />
      </div>
    </div>
  );
}
