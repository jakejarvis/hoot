"use client";

import { Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { captureClient } from "@/lib/analytics/client";
import { DomainLoadingState } from "./domain-loading-state";
import { DomainUnregisteredState } from "./domain-unregistered-state";
import { Favicon } from "./favicon";
import { useDomainHistory } from "./hooks/use-domain-history";
import { useDomainQueries } from "./hooks/use-domain-queries";
import { useTtlPreferences } from "./hooks/use-ttl-preferences";
import { CertificatesSection } from "./sections/certificates-section";
import { DnsRecordsSection } from "./sections/dns-records-section";
import { HeadersSection } from "./sections/headers-section";
import { HostingEmailSection } from "./sections/hosting-email-section";
import { RegistrationSection } from "./sections/registration-section";
import { exportDomainData } from "./utils/export-data";

export function DomainReportView({
  domain,
  initialWhois,
  initialRegistered,
}: {
  domain: string;
  initialWhois?: import("@/server/services/rdap-parser").Whois;
  initialRegistered?: boolean;
}) {
  const { whois, dns, hosting, certs, headers, allSectionsReady } =
    useDomainQueries(domain, { initialWhois, initialRegistered });
  const { showTtls, setShowTtls } = useTtlPreferences();

  // Manage domain history
  useDomainHistory(domain, whois.isSuccess, whois.data?.registered ?? false);

  const handleExportJson = () => {
    captureClient("export_json_clicked", { domain });
    exportDomainData(domain, {
      whois: whois.data,
      dns: dns.data,
      hosting: hosting.data,
      certificates: certs.data,
      headers: headers.data,
    });
  };

  // Show loading state until WHOIS completes
  if (whois.isLoading) {
    return <DomainLoadingState />;
  }

  // Show unregistered state if domain is not registered
  const isUnregistered = whois.isSuccess && whois.data?.registered === false;
  if (isUnregistered) {
    captureClient("report_unregistered_viewed", { domain });
    return <DomainUnregisteredState domain={domain} />;
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
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
          data={whois.data || null}
          isLoading={whois.isLoading}
          isError={!!whois.isError}
          onRetry={() => whois.refetch()}
        />

        <HostingEmailSection
          data={hosting.data || null}
          isLoading={hosting.isLoading}
          isError={!!hosting.isError}
          onRetry={() => hosting.refetch()}
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

        <CertificatesSection
          data={certs.data || null}
          isLoading={certs.isLoading}
          isError={!!certs.isError}
          onRetry={() => {
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
          onRetry={() => {
            captureClient("section_refetch_clicked", {
              domain,
              section: "headers",
            });
            headers.refetch();
          }}
        />
      </Accordion>
    </div>
  );
}

// helpers moved to @/lib/format
