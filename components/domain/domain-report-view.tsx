"use client";

import { Copy, Download, Globe, Lock, Server, Shield } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
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
    { enabled: !!domain, retry: 2 },
  );
  const hosting = trpc.domain.hosting.useQuery(
    { domain: resolvedDomain },
    { enabled: !!domain, retry: 1 },
  );
  const certs = trpc.domain.certificates.useQuery(
    { domain: resolvedDomain },
    { enabled: !!domain, retry: 0 },
  );
  const headers = trpc.domain.headers.useQuery(
    { domain: resolvedDomain },
    { enabled: !!domain, retry: 1 },
  );
  function copy(text: string) {
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

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Favicon domain={resolvedDomain} size={20} className="rounded" />
            <h2 className="text-xl font-semibold tracking-tight">
              {resolvedDomain}
            </h2>
          </div>
          <p className="text-muted-foreground text-sm">Mock data</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copy(resolvedDomain)}
          >
            <Copy className="mr-2 h-4 w-4" /> Copy domain
          </Button>
          <Button variant="default" size="sm" onClick={exportJson}>
            <Download className="mr-2 h-4 w-4" /> Export JSON
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
                  .map((r, i) => (
                    <KeyValue key={`A-${i}`} value={r.value} copyable />
                  ))}
              </DnsGroup>
              <DnsGroup title="AAAA Records" chart={2}>
                {dns.data
                  .filter((d) => d.type === "AAAA")
                  .map((r, i) => (
                    <KeyValue key={`AAAA-${i}`} value={r.value} copyable />
                  ))}
              </DnsGroup>
              <DnsGroup title="MX Records" chart={3}>
                {dns.data
                  .filter((d) => d.type === "MX")
                  .map((r, i) => (
                    <KeyValue
                      key={`MX-${i}`}
                      label={`${r.priority ? `Priority ${r.priority}` : ""}`}
                      value={r.value}
                      copyable
                    />
                  ))}
              </DnsGroup>
              <DnsGroup title="TXT Records" chart={5}>
                {dns.data
                  .filter((d) => d.type === "TXT")
                  .map((r, i) => (
                    <KeyValue key={`TXT-${i}`} value={r.value} copyable />
                  ))}
              </DnsGroup>
              <DnsGroup title="NS Records" chart={1}>
                {dns.data
                  .filter((d) => d.type === "NS")
                  .map((r, i) => (
                    <KeyValue key={`NS-${i}`} value={r.value} copyable />
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
            certs.data.map((c, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <KeyValue label="Issuer" value={c.issuer} />
                  <KeyValue label="Subject" value={c.subject} />
                  <KeyValue
                    label="Valid from"
                    value={formatDate(c.validFrom)}
                  />
                  <KeyValue label="Valid to" value={formatDate(c.validTo)} />
                  <KeyValue label="Key" value={c.keyType} />
                  <KeyValue label="Signature" value={c.signatureAlgorithm} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Chain: {c.chain.join(" → ")}
                </div>
              </div>
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
              {headers.data.map((h, i) => (
                <KeyValue key={i} label={h.name} value={h.value} copyable />
              ))}
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
