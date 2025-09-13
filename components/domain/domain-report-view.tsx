"use client";

import {
  ArrowDown,
  Download,
  Globe,
  Lock,
  Server,
  Shield,
  ShoppingBasket,
} from "lucide-react";
import Link from "next/link";
import React from "react";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { DnsGroup } from "./dns-group";
import { Favicon } from "./favicon";
import { KeyValue } from "./key-value";
import { ProviderLogo } from "./provider-logo";
import { Section } from "./section";
import { Skeletons } from "./skeletons";

export function DomainReportView({ domain }: { domain: string }) {
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
    a.download = `${resolvedDomain}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
            title="WHOIS"
            description="Registrar and registrant details"
            help="WHOIS shows registrar, registration dates, and registrant details."
            icon={<Shield className="h-4 w-4" />}
            accent="purple"
            status="loading"
          >
            <div className="space-y-2">
              <Skeleton className="h-10 rounded-2xl" />
              <Skeleton className="h-10 rounded-2xl" />
              <Skeleton className="h-10 rounded-2xl" />
              <Skeleton className="h-10 rounded-2xl" />
            </div>
          </Section>

          <Section
            title="DNS Records"
            description="A, AAAA, MX, CNAME, TXT, NS"
            help="DNS records map the domain to services like web (A/AAAA), mail (MX), and aliases (CNAME)."
            icon={<Globe className="h-4 w-4" />}
            accent="blue"
            status="loading"
          >
            <div className="space-y-2">
              <Skeleton className="h-10 rounded-2xl" />
              <Skeleton className="h-10 rounded-2xl" />
              <Skeleton className="h-10 rounded-2xl" />
              <Skeleton className="h-10 rounded-2xl" />
              <Skeleton className="h-10 rounded-2xl" />
              <Skeleton className="h-10 rounded-2xl" />
            </div>
          </Section>

          <Section
            title="Hosting & Email"
            description="Providers and IP geolocation"
            help="Hosting provider serves your site; email provider handles your domain's email."
            icon={<Server className="h-4 w-4" />}
            accent="green"
            status="loading"
          >
            <div className="space-y-2">
              <Skeleton className="h-10 rounded-2xl" />
              <Skeleton className="h-10 rounded-2xl" />
              <Skeleton className="h-10 rounded-2xl" />
            </div>
          </Section>

          <Section
            title="SSL Certificates"
            description="Issuer and validity"
            help="SSL/TLS certificates encrypt traffic and verify your domain's identity."
            icon={<Lock className="h-4 w-4" />}
            accent="orange"
            status="loading"
          >
            <div className="space-y-2">
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          </Section>

          <Section
            title="HTTP Headers"
            description="Server, security, caching"
            help="Headers include server info and security/caching directives returned by your site."
            icon={<Server className="h-4 w-4" />}
            accent="purple"
            status="loading"
          >
            <div className="space-y-2">
              <Skeleton className="h-10 rounded-2xl" />
              <Skeleton className="h-10 rounded-2xl" />
              <Skeleton className="h-10 rounded-2xl" />
              <Skeleton className="h-10 rounded-2xl" />
            </div>
          </Section>
        </Accordion>
      </div>
    );
  }

  const isUnregistered = whois.isSuccess && whois.data?.registered === false;

  if (isUnregistered) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
        <div className="relative overflow-hidden bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 rounded-3xl border border-white/15 dark:border-white/10 shadow-[0_8px_30px_rgb(0_0_0_/_0.12)] p-8 text-center">
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
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" onClick={exportJson}>
            <Download className="h-4 w-4" /> Export JSON
          </Button>
        </div>
      </div>

      <Accordion type="multiple" className="space-y-4">
        <Section
          title="WHOIS"
          description="Registrar and registrant details"
          help="WHOIS shows registrar, registration dates, and registrant details."
          icon={<Shield className="h-4 w-4" />}
          accent="purple"
          status={
            whois.isLoading ? "loading" : whois.isError ? "error" : "ready"
          }
        >
          {whois.data ? (
            <>
              <KeyValue
                label="Registrar"
                value={whois.data.registrar}
                leading={<ProviderLogo name={whois.data.registrar} />}
              />
              <KeyValue
                label="Created"
                value={formatDate(whois.data.creationDate)}
              />
              <KeyValue
                label="Expires"
                value={formatDate(whois.data.expirationDate)}
              />
              <KeyValue
                label="Registrant"
                value={`${whois.data.registrant.organization} (${whois.data.registrant.country})`}
              />
            </>
          ) : whois.isError ? (
            <div className="text-sm text-destructive flex items-center gap-2">
              Failed to load WHOIS.
              <Button
                variant="outline"
                size="sm"
                onClick={() => whois.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <Skeletons count={4} />
          )}
        </Section>

        <Section
          title="DNS Records"
          description="A, AAAA, MX, CNAME, TXT, NS"
          help="DNS records map the domain to services like web (A/AAAA), mail (MX), and aliases (CNAME)."
          icon={<Globe className="h-4 w-4" />}
          accent="blue"
          status={dns.isLoading ? "loading" : dns.isError ? "error" : "ready"}
        >
          {dns.data ? (
            <div className="space-y-4">
              <DnsGroup title="A Records" chart={1}>
                {dns.data
                  .filter((d) => d.type === "A")
                  .map((r) => (
                    <KeyValue key={`A-${r.value}`} value={r.value} copyable />
                  ))}
              </DnsGroup>
              <DnsGroup title="AAAA Records" chart={2}>
                {dns.data
                  .filter((d) => d.type === "AAAA")
                  .map((r) => (
                    <KeyValue
                      key={`AAAA-${r.value}`}
                      value={r.value}
                      copyable
                    />
                  ))}
              </DnsGroup>
              <DnsGroup title="MX Records" chart={3}>
                {dns.data
                  .filter((d) => d.type === "MX")
                  .map((r) => (
                    <KeyValue
                      key={`MX-${r.value}-${r.priority ?? ""}`}
                      label={`${r.priority ? `Priority ${r.priority}` : ""}`}
                      value={r.value}
                      copyable
                    />
                  ))}
              </DnsGroup>
              <DnsGroup title="TXT Records" chart={5}>
                {dns.data
                  .filter((d) => d.type === "TXT")
                  .map((r) => (
                    <KeyValue key={`TXT-${r.value}`} value={r.value} copyable />
                  ))}
              </DnsGroup>
              <DnsGroup title="NS Records" chart={1}>
                {dns.data
                  .filter((d) => d.type === "NS")
                  .map((r) => (
                    <KeyValue key={`NS-${r.value}`} value={r.value} copyable />
                  ))}
              </DnsGroup>
            </div>
          ) : dns.isError ? (
            <div className="text-sm text-destructive flex items-center gap-2">
              Failed to load DNS.
              <Button variant="outline" size="sm" onClick={() => dns.refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <Skeletons count={6} />
          )}
        </Section>

        <Section
          title="Hosting & Email"
          description="Providers and IP geolocation"
          help="Hosting provider serves your site; email provider handles your domain's email."
          icon={<Server className="h-4 w-4" />}
          accent="green"
          status={
            hosting.isLoading ? "loading" : hosting.isError ? "error" : "ready"
          }
        >
          {hosting.data ? (
            <>
              <KeyValue
                label="Hosting"
                value={hosting.data.hostingProvider}
                leading={<ProviderLogo name={hosting.data.hostingProvider} />}
              />
              <KeyValue
                label="Email"
                value={hosting.data.emailProvider}
                leading={<ProviderLogo name={hosting.data.emailProvider} />}
              />
              <KeyValue
                label="IP"
                value={`${hosting.data.ipAddress} (${hosting.data.geo.city}, ${hosting.data.geo.country})`}
                copyable
              />
            </>
          ) : hosting.isError ? (
            <div className="text-sm text-destructive flex items-center gap-2">
              Failed to load hosting details.
              <Button
                variant="outline"
                size="sm"
                onClick={() => hosting.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <Skeletons count={3} />
          )}
        </Section>

        <Section
          title="SSL Certificates"
          description="Issuer and validity"
          help="SSL/TLS certificates encrypt traffic and verify your domain's identity."
          icon={<Lock className="h-4 w-4" />}
          accent="orange"
          status={
            certs.isLoading ? "loading" : certs.isError ? "error" : "ready"
          }
        >
          {certs.data ? (
            certs.data.map((c, idx) => (
              <React.Fragment
                key={`cert-${c.subject}-${c.validFrom}-${c.validTo}`}
              >
                <div className="rounded-lg border p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <KeyValue label="Issuer" value={stripCN(c.issuer)} />
                    <KeyValue label="Subject" value={stripCN(c.subject)} />
                    <KeyValue
                      label="Valid from"
                      value={formatDate(c.validFrom)}
                    />
                    <KeyValue label="Valid to" value={formatDate(c.validTo)} />
                  </div>
                </div>
                {idx < certs.data.length - 1 && (
                  <div className="flex justify-center my-2" aria-hidden>
                    <ArrowDown className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                )}
              </React.Fragment>
            ))
          ) : certs.isError ? (
            <div className="text-sm text-destructive flex items-center gap-2">
              Failed to load certificates.
              <Button
                variant="outline"
                size="sm"
                onClick={() => certs.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <Skeletons count={1} />
          )}
        </Section>

        <Section
          title="HTTP Headers"
          description="Server, security, caching"
          help="Headers include server info and security/caching directives returned by your site."
          icon={<Server className="h-4 w-4" />}
          accent="purple"
          status={
            headers.isLoading ? "loading" : headers.isError ? "error" : "ready"
          }
        >
          {headers.data ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(() => {
                const important = new Set([
                  "strict-transport-security",
                  "content-security-policy",
                  "content-security-policy-report-only",
                  "x-frame-options",
                  "referrer-policy",
                  "server",
                  "x-powered-by",
                  "cache-control",
                  "permissions-policy",
                ]);
                return headers.data.map((h) => (
                  <KeyValue
                    key={`${h.name}:${h.value}`}
                    label={h.name}
                    value={h.value}
                    copyable
                    highlight={important.has(h.name)}
                  />
                ));
              })()}
            </div>
          ) : headers.isError ? (
            <div className="text-sm text-destructive flex items-center gap-2">
              Failed to load headers.
              <Button
                variant="outline"
                size="sm"
                onClick={() => headers.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <Skeletons count={4} />
          )}
        </Section>
      </Accordion>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function stripCN(value: string): string {
  if (!value) return value;
  return value.startsWith("CN=") ? value.slice(3) : value;
}
