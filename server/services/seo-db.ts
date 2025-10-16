import 'server-only';
import { db } from '@/server/db/client';
import { domains, seo } from '@/server/db/schema';
import type { SeoResponse } from '@/lib/schemas';
import { toRegistrableDomain } from '@/lib/domain-server';
import { eq } from 'drizzle-orm';

function nowPlusSeconds(sec: number): Date {
  return new Date(Date.now() + sec * 1000);
}

async function ensureDomainId(nameLower: string, tld: string): Promise<string> {
  const existing = await db.query.domains.findFirst({ where: (t, { eq }) => eq(t.name, nameLower), columns: { id: true } });
  if (existing) return existing.id;
  const inserted = await db.insert(domains).values({ name: nameLower, tld }).returning({ id: domains.id });
  return inserted[0]!.id;
}

export async function persistSeoToDb(inputDomain: string, response: SeoResponse): Promise<void> {
  const registrable = toRegistrableDomain(inputDomain);
  if (!registrable) return;
  const nameLower = registrable.toLowerCase();
  const tld = nameLower.split('.').slice(-1)[0] ?? '';
  const domainId = await ensureDomainId(nameLower, tld);

  // TTL: pick nearest (html 1h, robots 12h). If both present, 1h; else respective.
  const htmlTtl = 60 * 60;
  const robotsTtl = 12 * 60 * 60;
  const hasHtml = Boolean(response.meta);
  const hasRobots = Boolean(response.robots);
  const ttl = hasHtml && hasRobots ? htmlTtl : hasHtml ? htmlTtl : robotsTtl;
  const expiresAt = nowPlusSeconds(ttl);

  await db
    .insert(seo)
    .values({
      domainId,
      sourceFinalUrl: response.source.finalUrl ?? null,
      sourceStatus: response.source.status ?? null,
      metaOpenGraph: response.meta?.openGraph ?? null,
      metaTwitter: response.meta?.twitter ?? null,
      metaGeneral: response.meta?.general ?? null,
      previewTitle: response.preview?.title ?? null,
      previewDescription: response.preview?.description ?? null,
      previewImageUrl: response.preview?.image ?? null,
      previewImageUploadedUrl: response.preview?.imageUploaded ?? null,
      canonicalUrl: response.preview?.canonicalUrl ?? null,
      robots: response.robots ?? null,
      robotsSitemaps: response.robots?.sitemaps ?? null,
      errors: response.errors ?? null,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: seo.domainId,
      set: {
        sourceFinalUrl: response.source.finalUrl ?? null,
        sourceStatus: response.source.status ?? null,
        metaOpenGraph: response.meta?.openGraph ?? null,
        metaTwitter: response.meta?.twitter ?? null,
        metaGeneral: response.meta?.general ?? null,
        previewTitle: response.preview?.title ?? null,
        previewDescription: response.preview?.description ?? null,
        previewImageUrl: response.preview?.image ?? null,
        previewImageUploadedUrl: response.preview?.imageUploaded ?? null,
        canonicalUrl: response.preview?.canonicalUrl ?? null,
        robots: response.robots ?? null,
        robotsSitemaps: response.robots?.sitemaps ?? null,
        errors: response.errors ?? null,
        expiresAt,
      },
    });
}
