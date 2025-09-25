"use client";

import { Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { DomainRecord } from "rdapper";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { captureClient } from "@/lib/analytics/client";
import { useDomainHistory } from "../../hooks/use-domain-history";
import { useDomainQueries } from "../../hooks/use-domain-queries";
import { useTtlPreferences } from "../../hooks/use-ttl-preferences";
import { DomainLoadingState } from "./domain-loading-state";
import { DomainUnregisteredState } from "./domain-unregistered-state";
import { exportDomainData } from "./export-data";
import { Favicon } from "./favicon";
import { CertificatesSection } from "./sections/certificates-section";
import { DnsRecordsSection } from "./sections/dns-records-section";
import { HeadersSection } from "./sections/headers-section";
import { HostingEmailSection } from "./sections/hosting-email-section";
import { RegistrationSection } from "./sections/registration-section";

export function DomainReportView({
  domain,
  initialRegistration,
  initialRegistered,
}: {
  domain: string;
  initialRegistration?: DomainRecord;
  initialRegistered?: boolean;
}) {
  const { registration, dns, hosting, certs, headers, allSectionsReady } =
    useDomainQueries(domain, { initialRegistration, initialRegistered });
  const { showTtls, setShowTtls } = useTtlPreferences();

  // Manage domain history
  useDomainHistory(
    domain,
    registration.isSuccess,
    registration.data?.isRegistered ?? false,
  );

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
            <h2 className="text-xl font-semibold tracking-tight">{domain}</h2>
            <ExternalLink
              className="h-4 w-4 text-muted-foreground/60"
              aria-hidden="true"
            />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            disabled={!allSectionsReady}
          >
            <Download className="h-4 w-4" /> Export JSON
          </Button>
        </div>
      </div>

      <Accordion type="multiple" className="space-y-4">
        <RegistrationSection
          data={registration.data || null}
          isLoading={registration.isLoading}
          isError={!!registration.isError}
          onRetry={() => {
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
          onRetry={() => {
            captureClient("section_refetch_clicked", {
              domain,
              section: "hosting",
            });
            hosting.refetch();
          }}
        />

        <DnsRecordsSection
          records={dns.data || null}
          isLoading={dns.isLoading}
          isError={!!dns.isError}
          onRetry={() => {
            captureClient("section_refetch_clicked", {
              domain,
              section: "dns",
            });
            dns.refetch();
          }}
          showTtls={showTtls}
          onToggleTtls={(v) => {
            captureClient("ttl_preference_toggled", {
              domain,
              show_ttls: v,
            });
            setShowTtls(v);
          }}
        />

        {(() => {
          const dnsLoading = dns.isLoading;
          const hasAnyIp =
            dns.data?.some((r) => r.type === "A" || r.type === "AAAA") ?? false;
          const certsLoading = dnsLoading ? true : certs.isLoading;
          const certsData = dnsLoading
            ? null
            : hasAnyIp
              ? (certs.data ?? null)
              : [];
          return (
            <CertificatesSection
              data={certsData}
              isLoading={certsLoading}
              isError={!!certs.isError}
              onRetry={() => {
                captureClient("section_refetch_clicked", {
                  domain,
                  section: "certificates",
                });
                certs.refetch();
              }}
            />
          );
        })()}

        {(() => {
          const dnsLoading = dns.isLoading;
          const hasAnyIp =
            dns.data?.some((r) => r.type === "A" || r.type === "AAAA") ?? false;
          const headersLoading = dnsLoading ? true : headers.isLoading;
          const headersData = dnsLoading
            ? null
            : hasAnyIp
              ? (headers.data ?? null)
              : [];
          return (
            <HeadersSection
              data={headersData}
              isLoading={headersLoading}
              isError={!!headers.isError}
              onRetry={() => {
                captureClient("section_refetch_clicked", {
                  domain,
                  section: "headers",
                });
                headers.refetch();
              }}
            />
          );
        })()}
      </Accordion>
    </div>
  );
}
