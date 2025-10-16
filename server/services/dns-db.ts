import 'server-only';
import { db } from '@/server/db/client';
import { domains, dnsRecords } from '@/server/db/schema';
import { toRegistrableDomain } from '@/lib/domain-server';
import type { DnsResolveResult, DnsRecord, DnsResolver, DnsType } from '@/lib/schemas';
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

export async function persistDnsToDb(inputDomain: string, agg: DnsResolveResult): Promise<void> {
  const registrable = toRegistrableDomain(inputDomain);
  if (!registrable) return;
  const nameLower = registrable.toLowerCase();
  const tld = nameLower.split('.').slice(-1)[0] ?? '';
  const domainId = await ensureDomainId(nameLower, tld);

  const ttl = 5 * 60;
  const expiresAt = nowPlusSeconds(ttl);

  // Clear existing records; then insert current snapshot
  await db.delete(dnsRecords).where(sql`domain_id = ${domainId}`);

  if (Array.isArray(agg.records) && agg.records.length > 0) {
    await db.insert(dnsRecords).values(
      agg.records.map((r) => ({
        domainId,
        type: r.type as DnsType,
        name: r.name.toLowerCase(),
        value: r.value,
        ttl: r.ttl ?? null,
        priority: r.priority ?? null,
        isCloudflare: r.isCloudflare ?? null,
        resolver: agg.resolver as DnsResolver,
        expiresAt,
      })),
    );
  }
}
