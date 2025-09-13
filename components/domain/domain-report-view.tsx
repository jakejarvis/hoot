"use client"

import { Accordion } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Copy, Download } from "lucide-react"
import type { DomainReport } from "@/lib/mock"
import { Section } from "./section"
import { KeyValue } from "./key-value"
import { Shield, Server, Globe, Lock } from "lucide-react"
import { DnsGroup } from "./dns-group"

export function DomainReportView({ report }: { report: DomainReport }) {
  function copy(text: string) {
    navigator.clipboard.writeText(text)
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${report.domain}-whoozle.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{report.domain}</h2>
          <p className="text-muted-foreground text-sm">Mock data</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => copy(report.domain)}>
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
        >
          <KeyValue label="Registrar" value={report.whois.registrar} />
          <KeyValue label="Created" value={formatDate(report.whois.creationDate)} />
          <KeyValue label="Expires" value={formatDate(report.whois.expirationDate)} />
          <KeyValue
            label="Registrant"
            value={`${report.whois.registrant.organization} (${report.whois.registrant.country})`}
          />
        </Section>

        <Section
          title="DNS Records"
          description="A, AAAA, MX, CNAME, TXT, NS"
          help="DNS records map the domain to services like web (A/AAAA), mail (MX), and aliases (CNAME)."
          icon={<Globe className="h-4 w-4" />}
          accent="blue"
        >
          <div className="space-y-4">
            <DnsGroup title="A Records" chart={1}>
              {report.dns.filter((d) => d.type === "A").map((r, i) => (
                <KeyValue key={`A-${i}`} label={`${r.name}`} value={r.value} copyable />
              ))}
            </DnsGroup>
            <DnsGroup title="AAAA Records" chart={2}>
              {report.dns.filter((d) => d.type === "AAAA").map((r, i) => (
                <KeyValue key={`AAAA-${i}`} label={`${r.name}`} value={r.value} copyable />
              ))}
            </DnsGroup>
            <DnsGroup title="MX Records" chart={3}>
              {report.dns.filter((d) => d.type === "MX").map((r, i) => (
                <KeyValue key={`MX-${i}`} label={`${r.name}${r.priority ? ` (prio ${r.priority})` : ""}`} value={r.value} copyable />
              ))}
            </DnsGroup>
            <DnsGroup title="CNAME Records" chart={4}>
              {report.dns.filter((d) => d.type === "CNAME").map((r, i) => (
                <KeyValue key={`CNAME-${i}`} label={`${r.name}`} value={r.value} copyable />
              ))}
            </DnsGroup>
            <DnsGroup title="TXT Records" chart={5}>
              {report.dns.filter((d) => d.type === "TXT").map((r, i) => (
                <KeyValue key={`TXT-${i}`} label={`${r.name}`} value={r.value} copyable />
              ))}
            </DnsGroup>
            <DnsGroup title="NS Records" chart={1}>
              {report.dns.filter((d) => d.type === "NS").map((r, i) => (
                <KeyValue key={`NS-${i}`} label={`${r.name}`} value={r.value} copyable />
              ))}
            </DnsGroup>
          </div>
        </Section>

        <Section
          title="Hosting & Email"
          description="Providers and IP geolocation"
          help="Hosting provider serves your site; email provider handles your domain's email."
          icon={<Server className="h-4 w-4" />}
          accent="green"
        >
          <KeyValue label="Hosting" value={report.hosting.hostingProvider} />
          <KeyValue label="Email" value={report.hosting.emailProvider} />
          <KeyValue
            label="IP"
            value={`${report.hosting.ipAddress} (${report.hosting.geo.city}, ${report.hosting.geo.country})`}
            copyable
          />
        </Section>

        <Section
          title="SSL Certificates"
          description="Issuer and validity"
          help="SSL/TLS certificates encrypt traffic and verify your domain's identity."
          icon={<Lock className="h-4 w-4" />}
          accent="orange"
        >
          {report.certificates.map((c, i) => (
            <div key={i} className="rounded-lg border p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <KeyValue label="Issuer" value={c.issuer} />
                <KeyValue label="Subject" value={c.subject} />
                <KeyValue label="Valid from" value={formatDate(c.validFrom)} />
                <KeyValue label="Valid to" value={formatDate(c.validTo)} />
                <KeyValue label="Key" value={c.keyType} />
                <KeyValue label="Signature" value={c.signatureAlgorithm} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Chain: {c.chain.join(" → ")}</div>
            </div>
          ))}
        </Section>

        <Section
          title="HTTP Headers"
          description="Server, security, caching"
          help="Headers include server info and security/caching directives returned by your site."
          icon={<Server className="h-4 w-4" />}
          accent="purple"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {report.headers.map((h, i) => (
              <KeyValue key={i} label={h.name} value={h.value} copyable />
            ))}
          </div>
        </Section>
      </Accordion>
    </div>
  )
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}


