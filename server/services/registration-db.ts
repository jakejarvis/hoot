import 'server-only';
import { db } from '@/server/db/client';
import {
  domains,
  registrations,
  registrationNameservers,
  providers,
} from '@/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { Registration } from '@/lib/schemas';
import { toRegistrableDomain } from '@/lib/domain-server';

function nowPlusSeconds(sec: number): Date {
  return new Date(Date.now() + sec * 1000);
}

async function upsertDomain(nameLower: string, tld: string, punycodeName?: string | null, unicodeName?: string | null, isIdn?: boolean): Promise<string> {
  // Attempt by unique name
  const existing = await db.query.domains.findFirst({ where: (t, { eq }) => eq(t.name, nameLower) });
  if (existing) return existing.id;
  const inserted = await db.insert(domains)
    .values({ name: nameLower, tld, punycodeName: punycodeName ?? null, unicodeName: unicodeName ?? null, isIdn: Boolean(isIdn) })
    .returning({ id: domains.id });
  return inserted[0]!.id;
}

async function resolveProviderId(category: 'registrar' | 'hosting' | 'email' | 'dns' | 'ca', name: string, domain: string | null): Promise<string | null> {
  if (domain) {
    const got = await db.query.providers.findFirst({
      where: (p, { and, eq }) => and(eq(p.category, category), eq(p.domain, domain)),
      columns: { id: true },
    });
    if (got) return got.id;
  }
  const byName = await db
    .select({ id: providers.id })
    .from(providers)
    .where(sql`"category" = ${category} AND lower("name") = lower(${name})`)
    .limit(1);
  return byName[0]?.id ?? null;
}

export async function persistRegistrationToDb(inputDomain: string, record: Registration): Promise<void> {
  const registrable = toRegistrableDomain(inputDomain);
  if (!registrable) return;
  const nameLower = registrable.toLowerCase();
  const tld = record.tld;

  const domainId = await upsertDomain(nameLower, tld, record.punycodeName ?? null, record.unicodeName ?? null, record.isIDN ?? false);

  const ttl = record.isRegistered ? 24 * 60 * 60 : 60 * 60;
  const expiresAt = nowPlusSeconds(ttl);

  const registrarProviderId = await resolveProviderId('registrar', record.registrarProvider.name, record.registrarProvider.domain ?? null);

  await db
    .insert(registrations)
    .values({
      domainId,
      isRegistered: record.isRegistered,
      registry: record.registry ?? null,
      creationDate: record.creationDate ? new Date(record.creationDate) : null,
      updatedDate: record.updatedDate ? new Date(record.updatedDate) : null,
      expirationDate: record.expirationDate ? new Date(record.expirationDate) : null,
      deletionDate: record.deletionDate ? new Date(record.deletionDate) : null,
      transferLock: record.transferLock ?? null,
      statuses: record.statuses ?? null,
      contacts: record.contacts ?? null,
      whoisServer: record.whoisServer ?? null,
      rdapServers: record.rdapServers ?? null,
      source: record.source,
      registrarProviderId: registrarProviderId ?? null,
      resellerProviderId: null,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: registrations.domainId,
      set: {
        isRegistered: sql`excluded.is_registered`,
        registry: sql`excluded.registry`,
        creationDate: sql`excluded.creation_date`,
        updatedDate: sql`excluded.updated_date`,
        expirationDate: sql`excluded.expiration_date`,
        deletionDate: sql`excluded.deletion_date`,
        transferLock: sql`excluded.transfer_lock`,
        statuses: sql`excluded.statuses`,
        contacts: sql`excluded.contacts`,
        whoisServer: sql`excluded.whois_server`,
        rdapServers: sql`excluded.rdap_servers`,
        source: sql`excluded.source`,
        registrarProviderId: sql`excluded.registrar_provider_id`,
        resellerProviderId: sql`excluded.reseller_provider_id`,
        expiresAt: sql`excluded.expires_at`,
      },
    });

  // Nameservers
  await db.delete(registrationNameservers).where(eq(registrationNameservers.domainId, domainId));
  if (Array.isArray(record.nameservers)) {
    if (record.nameservers.length > 0) {
      await db.insert(registrationNameservers).values(
        record.nameservers.map((nsr) => ({
          domainId,
          host: nsr.host.toLowerCase(),
          ipv4: nsr.ipv4 ?? null,
          ipv6: nsr.ipv6 ?? null,
        })),
      );
    }
  }
}
