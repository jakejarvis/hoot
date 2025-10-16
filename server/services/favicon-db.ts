import 'server-only';
import { db } from '@/server/db/client';
import { domains } from '@/server/db/schema';
import { toRegistrableDomain } from '@/lib/domain-server';
import { eq, sql } from 'drizzle-orm';

function nowPlusSeconds(sec: number): Date { return new Date(Date.now() + sec * 1000); }

export async function persistFaviconToDb(inputDomain: string, url: string | null, key: string | undefined, ttlSeconds: number): Promise<void> {
  const registrable = toRegistrableDomain(inputDomain);
  if (!registrable) return;
  const nameLower = registrable.toLowerCase();
  const tld = nameLower.split('.').slice(-1)[0] ?? '';

  // Upsert domain if needed to attach favicon
  const existing = await db.query.domains.findFirst({ where: (t, { eq }) => eq(t.name, nameLower) });
  const domainId = existing?.id ?? (await db.insert(domains).values({ name: nameLower, tld }).returning({ id: domains.id }))[0]!.id;

  const expiresAt = nowPlusSeconds(ttlSeconds);
  await db
    .update(domains)
    .set({
      faviconUrl: url ?? null,
      faviconKey: key ?? null,
      faviconExpiresAt: expiresAt,
    })
    .where(eq(domains.id, domainId));
}
