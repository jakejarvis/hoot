import { Accordion } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Section } from "./section";

export function DomainLoadingState() {
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
