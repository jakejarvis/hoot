import 'server-only';
import { db } from '@/server/db/client';
import { domainAssets, domains } from '@/server/db/schema';
import { toRegistrableDomain } from '@/lib/domain-server';
import { eq, sql } from 'drizzle-orm';

function nowPlusSeconds(sec: number): Date { return new Date(Date.now() + sec * 1000); }

export async function persistScreenshotToDb(inputDomain: string, options: { url: string | null; key?: string; width: number; height: number; variant?: string; ttlSeconds: number; }): Promise<void> {
  const registrable = toRegistrableDomain(inputDomain);
  if (!registrable) return;
  const nameLower = registrable.toLowerCase();
  const tld = nameLower.split('.').slice(-1)[0] ?? '';

  // Ensure domain
  const existing = await db.query.domains.findFirst({ where: (t, { eq }) => eq(t.name, nameLower) });
  const domainId = existing?.id ?? (await db.insert(domains).values({ name: nameLower, tld }).returning({ id: domains.id }))[0]!.id;

  const expiresAt = nowPlusSeconds(options.ttlSeconds);
  const kind = 'screenshot';
  const variant = options.variant ?? 'default';

  await db
    .insert(domainAssets)
    .values({
      domainId,
      kind,
      variant,
      width: options.width,
      height: options.height,
      url: options.url ?? null,
      key: options.key ?? null,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: [domainAssets.domainId, domainAssets.kind, domainAssets.variant, domainAssets.width, domainAssets.height],
      set: {
        url: sql`excluded.url`,
        key: sql`excluded.key`,
        expiresAt: sql`excluded.expires_at`,
        updatedAt: sql`now()`
      }
    });
}
