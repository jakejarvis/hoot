import { captureServer } from "@/lib/analytics/server";
import { toRegistrableDomain } from "@/lib/domain-server";
import {
  detectDnsProvider,
  detectEmailProvider,
  detectHostingProvider,
} from "@/lib/providers/detection";
import { getOrSetZod, ns } from "@/lib/redis";
import { type Hosting, HostingSchema } from "@/lib/schemas";
import { resolveAll } from "@/server/services/dns";
import { probeHeaders } from "@/server/services/headers";
import { lookupIpMeta } from "@/server/services/ip";

export async function detectHosting(domain: string): Promise<Hosting> {
  const key = ns("hosting", domain.toLowerCase());
  const schema = HostingSchema;
  return await getOrSetZod<Hosting>(
    key,
    24 * 60 * 60,
    async () => {
      const { records: dns } = await resolveAll(domain);
      const a = dns.find((d) => d.type === "A");
      const mx = dns.filter((d) => d.type === "MX");
      const ns = dns.filter((d) => d.type === "NS");
      const ip = a?.value ?? null;

      const headers = await probeHeaders(domain).catch(
        () => [] as { name: string; value: string }[],
      );

      const meta = ip
        ? await lookupIpMeta(ip)
        : {
            geo: {
              city: "",
              region: "",
              country: "",
              lat: null,
              lon: null,
              emoji: null,
            },
            owner: null,
          };
      const geo = meta.geo;

      // Hosting provider detection with fallback:
      // - If no A record/IP → unset → "none"
      // - Else if unknown → try IP ownership org/ISP
      const hosting = detectHostingProvider(headers);

      let hostingName = hosting.name;
      let hostingIconDomain = hosting.domain;
      if (!ip) {
        hostingName = "none";
        hostingIconDomain = null;
      } else if (/^unknown$/i.test(hostingName)) {
        if (meta.owner) hostingName = meta.owner;
        hostingIconDomain = null;
      }

      // Determine email provider, using "none" when MX is unset
      const email =
        mx.length === 0
          ? { name: "none", domain: null }
          : detectEmailProvider(mx.map((m) => m.value));
      let emailName = email.name;
      let emailIconDomain = email.domain;

      // DNS provider from nameservers
      const dnsResult = detectDnsProvider(ns.map((n) => n.value));
      let dnsName = dnsResult.name;
      let dnsIconDomain = dnsResult.domain;

      // If no known match for email provider, fall back to the root domain of the first MX host
      if (emailName !== "none" && !emailIconDomain && mx[0]?.value) {
        const root = toRegistrableDomain(mx[0].value);
        if (root) {
          emailName = root;
          emailIconDomain = root;
        }
      }

      // If no known match for DNS provider, fall back to the root domain of the first NS host
      if (!dnsIconDomain && ns[0]?.value) {
        const root = toRegistrableDomain(ns[0].value);
        if (root) {
          dnsName = root;
          dnsIconDomain = root;
        }
      }

      const info: Hosting = {
        hostingProvider: { name: hostingName, domain: hostingIconDomain },
        emailProvider: { name: emailName, domain: emailIconDomain },
        dnsProvider: { name: dnsName, domain: dnsIconDomain },
        geo,
      };
      await captureServer("hosting_detected", {
        domain,
        hosting: hostingName,
        email: emailName,
        dns_provider: dnsName,
        ip_present: Boolean(ip),
        geo_country: geo.country || "",
      });
      return info;
    },
    schema,
  );
}
