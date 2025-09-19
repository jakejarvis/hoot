"use client";

import { Download, ExternalLink, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
// tooltip components no longer used directly here
import { trpc } from "@/lib/trpc/client";
import { Favicon } from "./favicon";
import { Section } from "./section";
import { CertificatesSection } from "./sections/certificates-section";
import { DnsRecordsSection } from "./sections/dns-records-section";
import { HeadersSection } from "./sections/headers-section";
import { HostingEmailSection } from "./sections/hosting-email-section";
import { RegistrationSection } from "./sections/registration-section";

export function DomainReportView({ domain }: { domain: string }) {
  // Hosting map dynamically imported inside section component
  const resolvedDomain = domain;
  const whois = trpc.domain.whois.useQuery(
    { domain: resolvedDomain },
    { enabled: !!domain, retry: 1 },
  );
  const dns = trpc.domain.dns.useQuery(
    { domain: resolvedDomain },
    { enabled: !!domain && whois.data?.registered === true, retry: 2 },
  );
  const hosting = trpc.domain.hosting.useQuery(
    { domain: resolvedDomain },
    { enabled: !!domain && whois.data?.registered === true, retry: 1 },
  );
  const certs = trpc.domain.certificates.useQuery(
    { domain: resolvedDomain },
    { enabled: !!domain && whois.data?.registered === true, retry: 0 },
  );
  const headers = trpc.domain.headers.useQuery(
    { domain: resolvedDomain },
    { enabled: !!domain && whois.data?.registered === true, retry: 1 },
  );
  function _copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  function exportJson() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            domain: resolvedDomain,
            whois: whois.data,
            dns: dns.data,
            hosting: hosting.data,
            certificates: certs.data,
            headers: headers.data,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resolvedDomain}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const [showTtls, setShowTtls] = React.useState(false);
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("hoot-show-dns-ttls");
      if (stored !== null) setShowTtls(stored === "1");
    } catch {}
  }, []);
  React.useEffect(() => {
    try {
      localStorage.setItem("hoot-show-dns-ttls", showTtls ? "1" : "0");
    } catch {}
  }, [showTtls]);

  // no need for layout probing; we will place the toggle in the section header

  React.useEffect(() => {
    if (whois.isSuccess && whois.data?.registered === true) {
      try {
        const stored = localStorage.getItem("hoot-history");
        const list = stored ? (JSON.parse(stored) as string[]) : [];
        const next = [
          resolvedDomain,
          ...list.filter((d) => d !== resolvedDomain),
        ].slice(0, 5);
        localStorage.setItem("hoot-history", JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
    }
  }, [whois.isSuccess, whois.data?.registered, resolvedDomain]);

  // Show only a loading indicator until WHOIS completes (registration validated)
  if (whois.isLoading) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>

        <Accordion type="multiple" className="space-y-4">
          <Section
            title="Registration"
            description="Registrar and registrant details"
            help="WHOIS shows registrar, registration dates, and registrant details."
            status="loading"
          />
          <Section
            title="Hosting & Email"
            description="Providers and IP geolocation"
            help="Hosting provider serves a site; email provider handles a domain's email."
            status="loading"
          />
          <Section
            title="DNS Records"
            description="A, AAAA, MX, CNAME, TXT, NS"
            help="DNS records map the domain to services like web (A/AAAA), mail (MX), and aliases (CNAME)."
            status="loading"
          />
          <Section
            title="SSL Certificates"
            description="Issuer and validity"
            help="SSL/TLS certificates encrypt traffic and verify a domain's identity."
            status="loading"
          />
          <Section
            title="HTTP Headers"
            description="Server, security, caching"
            help="Headers include server info and security/caching directives returned by a site."
            status="loading"
          />
        </Accordion>
      </div>
    );
  }

  const isUnregistered = whois.isSuccess && whois.data?.registered === false;

  if (isUnregistered) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
        <div className="relative overflow-hidden bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 rounded-3xl border border-black/10 dark:border-white/10 shadow-[0_8px_30px_rgb(0_0_0_/_0.12)] p-8 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-16 -top-16 h-40 blur-3xl opacity-40 bg-[radial-gradient(closest-side,oklch(0.86_0.12_60),transparent)]"
          />
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {resolvedDomain}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            This domain appears to be unregistered.
          </p>
          <div className="mt-5 flex justify-center">
            <Button size="lg" className="gap-2" asChild>
              <Link
                href={`https://porkbun.com/checkout/search?q=${resolvedDomain}`}
                target="_blank"
                rel="noopener"
                aria-label="Register this domain"
              >
                <ShoppingBasket className="h-4 w-4" /> But it could be yours!
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const allSectionsReady =
    whois.isSuccess &&
    whois.data?.registered === true &&
    dns.isSuccess &&
    hosting.isSuccess &&
    certs.isSuccess &&
    headers.isSuccess;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`https://${resolvedDomain}`}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2"
          >
            <Favicon domain={resolvedDomain} size={20} className="rounded" />
            <h2 className="text-xl font-semibold tracking-tight">
              {resolvedDomain}
            </h2>
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
            onClick={exportJson}
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
          onRetry={() => dns.refetch()}
          showTtls={showTtls}
          onToggleTtls={(v) => setShowTtls(v)}
        />

        <CertificatesSection
          data={certs.data || null}
          isLoading={certs.isLoading}
          isError={!!certs.isError}
          onRetry={() => certs.refetch()}
        />

        <HeadersSection
          data={headers.data || null}
          isLoading={headers.isLoading}
          isError={!!headers.isError}
          onRetry={() => headers.refetch()}
        />
      </Accordion>
    </div>
  );
}

// helpers moved to @/lib/format
