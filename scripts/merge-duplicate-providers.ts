import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  certificates,
  hosting,
  type providerCategory,
  providers,
  registrations,
} from "@/lib/db/schema";

// One-off helper to:
// 1) Mark catalog rows when they match by (category, domain) or (category, slug)
// 2) Merge duplicates by (category, domain) where domain IS NOT NULL, preferring catalog

type Category = (typeof providerCategory.enumValues)[number];

export async function mergeDuplicateGroup(
  cat: Category,
  dom: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    // Re-select with row-level locks to prevent concurrent modifications
    const rows = await tx
      .select()
      .from(providers)
      .where(and(eq(providers.category, cat), eq(providers.domain, dom)))
      .orderBy(desc(eq(providers.source, "catalog")), asc(providers.createdAt))
      .for("update");
    if (rows.length <= 1) return;
    const target = rows[0];
    const duplicates = rows.slice(1);
    const dupIds = duplicates.map((r) => r.id);
    // Repoint FKs
    await tx
      .update(hosting)
      .set({ hostingProviderId: target.id })
      .where(inArray(hosting.hostingProviderId, dupIds));
    await tx
      .update(hosting)
      .set({ emailProviderId: target.id })
      .where(inArray(hosting.emailProviderId, dupIds));
    await tx
      .update(hosting)
      .set({ dnsProviderId: target.id })
      .where(inArray(hosting.dnsProviderId, dupIds));
    await tx
      .update(registrations)
      .set({ registrarProviderId: target.id })
      .where(inArray(registrations.registrarProviderId, dupIds));
    await tx
      .update(registrations)
      .set({ resellerProviderId: target.id })
      .where(inArray(registrations.resellerProviderId, dupIds));
    await tx
      .update(certificates)
      .set({ caProviderId: target.id })
      .where(inArray(certificates.caProviderId, dupIds));
    // Delete duplicates
    await tx.delete(providers).where(inArray(providers.id, dupIds));
  });
}

export async function listDuplicateDomains(): Promise<
  Array<{ category: Category; domain: string }>
> {
  const rows = await db
    .select({ category: providers.category, domain: providers.domain })
    .from(providers)
    .where(isNotNull(providers.domain))
    .groupBy(providers.category, providers.domain)
    .having(sql`${count()} > 1`);
  return rows.map((r) => ({
    category: r.category,
    domain: r.domain as string,
  }));
}

export async function mergeAllDuplicateProviders(): Promise<number> {
  const dups = await listDuplicateDomains();
  for (const d of dups) {
    await mergeDuplicateGroup(d.category, d.domain);
  }
  return dups.length;
}

async function main() {
  const merged = await mergeAllDuplicateProviders();
  console.log(`Merged ${merged} duplicate (category, domain) groups.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
