import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { captureServer } from "@/lib/analytics/server";
import { toRegistrableDomain } from "@/lib/domain-server";
import {
  detectDnsProvider,
  detectEmailProvider,
  detectHostingProvider,
} from "@/lib/providers/detection";
import type { Hosting } from "@/lib/schemas";
import { db } from "@/server/db/client";
import {
  hosting as hostingTable,
  providers as providersTable,
} from "@/server/db/schema";
import { ttlForHosting } from "@/server/db/ttl";
import { upsertDomain } from "@/server/repos/domains";
import { upsertHosting } from "@/server/repos/hosting";
import { resolveProviderId } from "@/server/repos/providers";
import { resolveAll } from "@/server/services/dns";
import { probeHeaders } from "@/server/services/headers";
import { lookupIpMeta } from "@/server/services/ip";

export async function detectHosting(domain: string): Promise<Hosting> {
  const startedAt = Date.now();
  console.debug("[hosting] start", { domain });

  // Fast path: DB
  const registrable = toRegistrableDomain(domain);
  const d = registrable
    ? await upsertDomain({
        name: registrable,
        tld: registrable.split(".").slice(1).join(".") as string,
        punycodeName: registrable,
        unicodeName: domain,
        isIdn: registrable !== domain.toLowerCase(),
      })
    : null;
  const existing = d
    ? await db
        .select({
          hostingProviderId: hostingTable.hostingProviderId,
          emailProviderId: hostingTable.emailProviderId,
          dnsProviderId: hostingTable.dnsProviderId,
          geoCity: hostingTable.geoCity,
          geoRegion: hostingTable.geoRegion,
          geoCountry: hostingTable.geoCountry,
          geoCountryCode: hostingTable.geoCountryCode,
          geoLat: hostingTable.geoLat,
          geoLon: hostingTable.geoLon,
          expiresAt: hostingTable.expiresAt,
        })
        .from(hostingTable)
        .where(eq(hostingTable.domainId, d.id))
    : ([] as Array<{
        hostingProviderId: string | null;
        emailProviderId: string | null;
        dnsProviderId: string | null;
        geoCity: string | null;
        geoRegion: string | null;
        geoCountry: string | null;
        geoCountryCode: string | null;
        geoLat: number | null;
        geoLon: number | null;
        expiresAt: Date | null;
      }>);
  if (
    d &&
    existing[0] &&
    (existing[0].expiresAt?.getTime?.() ?? 0) > Date.now()
  ) {
    // Fast path: return hydrated providers from DB when TTL is valid
    const hp = alias(providersTable, "hp");
    const ep = alias(providersTable, "ep");
    const dp = alias(providersTable, "dp");
    const hydrated = await db
      .select({
        hostingProviderName: hp.name,
        hostingProviderDomain: hp.domain,
        emailProviderName: ep.name,
        emailProviderDomain: ep.domain,
        dnsProviderName: dp.name,
        dnsProviderDomain: dp.domain,
        geoCity: hostingTable.geoCity,
        geoRegion: hostingTable.geoRegion,
        geoCountry: hostingTable.geoCountry,
        geoCountryCode: hostingTable.geoCountryCode,
        geoLat: hostingTable.geoLat,
        geoLon: hostingTable.geoLon,
      })
      .from(hostingTable)
      .leftJoin(hp, eq(hp.id, hostingTable.hostingProviderId))
      .leftJoin(ep, eq(ep.id, hostingTable.emailProviderId))
      .leftJoin(dp, eq(dp.id, hostingTable.dnsProviderId))
      .where(eq(hostingTable.domainId, d.id))
      .limit(1);
    const row = hydrated[0];
    if (row) {
      const info: Hosting = {
        hostingProvider: {
          name: row.hostingProviderName ?? "Unknown",
          domain: row.hostingProviderDomain ?? null,
        },
        emailProvider: {
          name: row.emailProviderName ?? "Unknown",
          domain: row.emailProviderDomain ?? null,
        },
        dnsProvider: {
          name: row.dnsProviderName ?? "Unknown",
          domain: row.dnsProviderDomain ?? null,
        },
        geo: {
          city: row.geoCity ?? "",
          region: row.geoRegion ?? "",
          country: row.geoCountry ?? "",
          country_code: row.geoCountryCode ?? "",
          lat: row.geoLat ?? null,
          lon: row.geoLon ?? null,
        },
      };
      console.info("[hosting] cache", {
        domain,
        hosting: info.hostingProvider.name,
        email: info.emailProvider.name,
        dns_provider: info.dnsProvider.name,
        duration_ms: Date.now() - startedAt,
      });
      return info;
    }
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
    domain: registrable ?? domain,
    hosting: hostingName,
    email: emailName,
    dns_provider: dnsName,
    ip_present: Boolean(ip),
    geo_country: geo.country || "",
    duration_ms: Date.now() - startedAt,
  });
  // Persist to Postgres
  const now = new Date();
  if (d) {
    const [hostingProviderId, emailProviderId, dnsProviderId] =
      await Promise.all([
        resolveProviderId({
          category: "hosting",
          domain: hostingIconDomain,
          name: hostingName,
        }),
        resolveProviderId({
          category: "email",
          domain: emailIconDomain,
          name: emailName,
        }),
        resolveProviderId({
          category: "dns",
          domain: dnsIconDomain,
          name: dnsName,
        }),
      ]);
    await upsertHosting({
      domainId: d.id,
      hostingProviderId,
      emailProviderId,
      dnsProviderId,
      geoCity: geo.city,
      geoRegion: geo.region,
      geoCountry: geo.country,
      geoCountryCode: geo.country_code,
      geoLat: geo.lat ?? null,
      geoLon: geo.lon ?? null,
      fetchedAt: now,
      expiresAt: ttlForHosting(now),
    });
  }
  console.info("[hosting] ok", {
    domain: registrable ?? domain,
    hosting: hostingName,
    email: emailName,
    dns_provider: dnsName,
    duration_ms: Date.now() - startedAt,
  });
  return info;
}
