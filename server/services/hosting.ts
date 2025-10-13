import { captureServer } from "@/lib/analytics/server";
import { toRegistrableDomain } from "@/lib/domain-server";
import {
  detectDnsProvider,
  detectEmailProvider,
  detectHostingProvider,
} from "@/lib/providers/detection";
import { ns, redis } from "@/lib/redis";
import type { Hosting } from "@/lib/schemas";
import { resolveAll } from "@/server/services/dns";
import { probeHeaders } from "@/server/services/headers";
import { lookupIpMeta } from "@/server/services/ip";

export async function detectHosting(domain: string): Promise<Hosting> {
  const startedAt = Date.now();
  console.debug("[hosting] start", { domain });

  const key = ns("hosting", domain.toLowerCase());
  const cached = await redis.get<Hosting>(key);
  if (cached) {
    console.info("[hosting] cache hit", { domain });
    return cached;
  }

  const { records: dns } = await resolveAll(domain);
  const a = dns.find((d) => d.type === "A");
  const mx = dns.filter((d) => d.type === "MX");
  const nsRecords = dns.filter((d) => d.type === "NS");
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
          country_code: "",
          lat: null,
          lon: null,
        },
        owner: null,
        domain: null,
      };
  const geo = meta.geo;

  // Hosting provider detection with fallback:
  // - If no A record/IP → unset → "Not configured"
  // - Else if unknown → try IP ownership org/ISP
  const hosting = detectHostingProvider(headers);

  let hostingName = hosting.name;
  let hostingIconDomain = hosting.domain;
  if (!ip) {
    hostingName = "Not configured";
    hostingIconDomain = null;
  } else if (/^unknown$/i.test(hostingName)) {
    if (meta.owner) hostingName = meta.owner;
    hostingIconDomain = meta.domain ?? null;
  }

  // Determine email provider, using "Not configured" when MX is unset
  const email =
    mx.length === 0
      ? { name: "Not configured", domain: null }
      : detectEmailProvider(mx.map((m) => m.value));
  let emailName = email.name;
  let emailIconDomain = email.domain;

  // DNS provider from nameservers
  const dnsResult = detectDnsProvider(nsRecords.map((n) => n.value));
  let dnsName = dnsResult.name;
  let dnsIconDomain = dnsResult.domain;

  // If no known match for email provider, fall back to the root domain of the first MX host
  if (emailName !== "Not configured" && !emailIconDomain && mx[0]?.value) {
    const root = toRegistrableDomain(mx[0].value);
    if (root) {
      emailName = root;
      emailIconDomain = root;
    }
  }

  // If no known match for DNS provider, fall back to the root domain of the first NS host
  if (!dnsIconDomain && nsRecords[0]?.value) {
    const root = toRegistrableDomain(nsRecords[0].value);
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
    duration_ms: Date.now() - startedAt,
  });
  await redis.set(key, info, { ex: 24 * 60 * 60 });
  console.info("[hosting] ok", {
    domain,
    hosting: hostingName,
    email: emailName,
    dns_provider: dnsName,
    duration_ms: Date.now() - startedAt,
  });
  return info;
}
