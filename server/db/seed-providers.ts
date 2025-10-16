import 'server-only';
import { db } from './client';
import { providers, providerAliases, providerCategoryEnum } from './schema';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { HOSTING_PROVIDERS } from '@/lib/providers/rules/hosting';
import { EMAIL_PROVIDERS } from '@/lib/providers/rules/email';
import { REGISTRAR_PROVIDERS } from '@/lib/providers/rules/registrar';
import { CA_PROVIDERS } from '@/lib/providers/rules/certificate';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

type SeedItem = { name: string; domain: string | null; category: typeof providerCategoryEnum.enumValues[number]; aliases?: string[] };

const CATALOGS: SeedItem[] = [
  ...HOSTING_PROVIDERS.map((p) => ({ name: p.name, domain: p.domain ?? null, category: 'hosting' as const })),
  ...EMAIL_PROVIDERS.map((p) => ({ name: p.name, domain: p.domain ?? null, category: 'email' as const })),
  ...REGISTRAR_PROVIDERS.map((p) => ({ name: p.name, domain: p.domain ?? null, category: 'registrar' as const })),
  ...CA_PROVIDERS.map((p) => ({ name: p.name, domain: p.domain ?? null, category: 'ca' as const })),
];

export async function seedProviders(): Promise<void> {
  for (const item of CATALOGS) {
    const slug = slugify(`${item.category}:${item.name}`);
    // Upsert by (category, domain) when domain present; else (category, lower(name))
    if (item.domain) {
      const existing = await db.query.providers.findFirst({
        where: (p, { and, eq }) => and(eq(p.category, item.category), eq(p.domain, item.domain)),
      });
      if (existing) continue;
      await db.insert(providers).values({ category: item.category, name: item.name, domain: item.domain, slug });
      continue;
    }
    const existingByName = await db
      .select()
      .from(providers)
      .where(sql`"category" = ${item.category} AND lower("name") = lower(${item.name})`)
      .limit(1);
    if (existingByName.length > 0) continue;
    await db.insert(providers).values({ category: item.category, name: item.name, slug });
  }
}

if (require.main === module) {
  seedProviders()
    .then(() => {
      console.info('[seed] providers seeded');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[seed] providers failed', err);
      process.exit(1);
    });
}
