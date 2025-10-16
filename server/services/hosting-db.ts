import 'server-only';
import { db } from '@/server/db/client';
import { domains, hosting, providers } from '@/server/db/schema';
import type { Hosting } from '@/lib/schemas';
import { toRegistrableDomain } from '@/lib/domain-server';
import { sql } from 'drizzle-orm';

function nowPlusSeconds(sec: number): Date {
  return new Date(Date.now() + sec * 1000);
}

async function ensureDomainId(nameLower: string, tld: string): Promise<string> {
  const existing = await db.query.domains.findFirst({ where: (t, { eq }) => eq(t.name, nameLower), columns: { id: true } });
  if (existing) return existing.id;
  const inserted = await db.insert(domains).values({ name: nameLower, tld }).returning({ id: domains.id });
  return inserted[0]!.id;
}

async function resolveProviderId(category: 'hosting' | 'email' | 'dns', name: string, domain: string | null): Promise<string | null> {
  if (domain) {
    const got = await db.query.providers.findFirst({ where: (p, { and, eq }) => and(eq(p.category, category), eq(p.domain, domain)), columns: { id: true } });
    if (got) return got.id;
  }
  const byName = await db.select({ id: providers.id }).from(providers).where(sql`"category" = ${category} AND lower("name") = lower(${name})`).limit(1);
  return byName[0]?.id ?? null;
}

export async function persistHostingToDb(inputDomain: string, info: Hosting): Promise<void> {
  const registrable = toRegistrableDomain(inputDomain);
  if (!registrable) return;
  const nameLower = registrable.toLowerCase();
  const tld = nameLower.split('.').slice(-1)[0] ?? '';
  const domainId = await ensureDomainId(nameLower, tld);

  const ttl = 24 * 60 * 60;
  const expiresAt = nowPlusSeconds(ttl);

  await db
    .insert(hosting)
    .values({
      domainId,
      hostingProviderId: (await resolveProviderId('hosting', info.hostingProvider.name, info.hostingProvider.domain ?? null))!,
      emailProviderId: (await resolveProviderId('email', info.emailProvider.name, info.emailProvider.domain ?? null))!,
      dnsProviderId: (await resolveProviderId('dns', info.dnsProvider.name, info.dnsProvider.domain ?? null))!,
      geoCity: info.geo.city,
      geoRegion: info.geo.region,
      geoCountry: info.geo.country,
      geoCountryCode: info.geo.country_code,
      geoLat: info.geo.lat ?? null,
      geoLon: info.geo.lon ?? null,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: hosting.domainId,
      set: {
        hostingProviderId: sql`excluded.hosting_provider_id`,
        emailProviderId: sql`excluded.email_provider_id`,
        dnsProviderId: sql`excluded.dns_provider_id`,
        geoCity: sql`excluded.geo_city`,
        geoRegion: sql`excluded.geo_region`,
        geoCountry: sql`excluded.geo_country`,
        geoCountryCode: sql`excluded.geo_country_code`,
        geoLat: sql`excluded.geo_lat`,
        geoLon: sql`excluded.geo_lon`,
        expiresAt: sql`excluded.expires_at`,
      },
    });
}
