import 'server-only';
import { db } from '@/server/db/client';
import { domains, httpHeaders } from '@/server/db/schema';
import type { HttpHeader } from '@/lib/schemas';
import { toRegistrableDomain } from '@/lib/domain-server';
import { eq, sql } from 'drizzle-orm';

function nowPlusSeconds(sec: number): Date {
  return new Date(Date.now() + sec * 1000);
}

async function ensureDomainId(nameLower: string, tld: string): Promise<string> {
  const existing = await db.query.domains.findFirst({ where: (t, { eq }) => eq(t.name, nameLower), columns: { id: true } });
  if (existing) return existing.id;
  const inserted = await db.insert(domains).values({ name: nameLower, tld }).returning({ id: domains.id });
  return inserted[0]!.id;
}

export async function persistHeadersToDb(inputDomain: string, headers: HttpHeader[]): Promise<void> {
  const registrable = toRegistrableDomain(inputDomain);
  if (!registrable) return;
  const nameLower = registrable.toLowerCase();
  const tld = nameLower.split('.').slice(-1)[0] ?? '';
  const domainId = await ensureDomainId(nameLower, tld);

  const ttl = 10 * 60;
  const expiresAt = nowPlusSeconds(ttl);

  await db.delete(httpHeaders).where(eq(httpHeaders.domainId, domainId));
  if (headers.length > 0) {
    await db.insert(httpHeaders).values(
      headers.map((h) => ({ domainId, name: h.name.toLowerCase(), value: h.value, expiresAt })),
    );
  }
}
