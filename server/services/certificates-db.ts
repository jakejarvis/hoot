import 'server-only';
import { db } from '@/server/db/client';
import { certificates, domains, providers } from '@/server/db/schema';
import type { Certificate } from '@/lib/schemas';
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

async function resolveCaProviderId(name: string, domain: string | null): Promise<string | null> {
  if (domain) {
    const got = await db.query.providers.findFirst({ where: (p, { and, eq }) => and(eq(p.category, 'ca'), eq(p.domain, domain)), columns: { id: true } });
    if (got) return got.id;
  }
  const byName = await db.select({ id: providers.id }).from(providers).where(sql`"category" = 'ca' AND lower("name") = lower(${name})`).limit(1);
  return byName[0]?.id ?? null;
}

export async function persistCertificatesToDb(inputDomain: string, chain: Certificate[]): Promise<void> {
  const registrable = toRegistrableDomain(inputDomain);
  if (!registrable) return;
  const nameLower = registrable.toLowerCase();
  const tld = nameLower.split('.').slice(-1)[0] ?? '';
  const domainId = await ensureDomainId(nameLower, tld);

  const ttl = chain.length > 0 ? 12 * 60 * 60 : 10 * 60;
  const expiresAt = nowPlusSeconds(ttl);

  // Replace snapshot
  await db.delete(certificates).where(sql`domain_id = ${domainId}`);

  if (chain.length > 0) {
    await db.insert(certificates).values(
      await Promise.all(
        chain.map(async (c) => ({
          domainId,
          issuer: c.issuer,
          subject: c.subject,
          altNames: c.altNames,
          validFrom: new Date(c.validFrom),
          validTo: new Date(c.validTo),
          caProviderId: (await resolveCaProviderId(c.caProvider.name, c.caProvider.domain ?? null))!,
          expiresAt,
        })),
      ),
    );
  }
}
