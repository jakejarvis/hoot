import * as dotenv from "dotenv";

// Load common local envs first if present, then default .env
dotenv.config({ path: ".env.local" });
dotenv.config();

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { type providerCategory, providers } from "@/lib/db/schema";
import {
  CA_PROVIDERS,
  DNS_PROVIDERS,
  EMAIL_PROVIDERS,
  HOSTING_PROVIDERS,
  REGISTRAR_PROVIDERS,
} from "@/lib/providers/catalog";

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

type SeedDef = {
  name: string;
  domain: string | null;
  category: (typeof providerCategory.enumValues)[number];
  aliases?: string[];
};

function collect(): SeedDef[] {
  const arr: SeedDef[] = [];
  const push = (
    cat: SeedDef["category"],
    src: { name: string; domain: string }[],
  ) => {
    for (const p of src)
      arr.push({ name: p.name, domain: p.domain ?? null, category: cat });
  };
  push("dns", DNS_PROVIDERS);
  push("email", EMAIL_PROVIDERS);
  push("hosting", HOSTING_PROVIDERS);
  push("registrar", REGISTRAR_PROVIDERS);
  push("ca", CA_PROVIDERS);
  return arr;
}

async function main() {
  const defs = collect();
  let inserted = 0;
  let updated = 0;

  console.log(`Fetching existing providers...`);
  // Fetch all existing providers at once to avoid N+1 queries
  const allExisting = await db.select().from(providers);

  // Build lookup maps for fast comparison
  const byDomain = new Map<string, typeof allExisting>();
  const bySlug = new Map<string, (typeof allExisting)[number]>();

  for (const existing of allExisting) {
    // Key: "category:domain"
    if (existing.domain) {
      const key = `${existing.category}:${existing.domain}`;
      const domainList = byDomain.get(key);
      if (domainList) {
        domainList.push(existing);
      } else {
        byDomain.set(key, [existing]);
      }
    }
    // Key: "category:slug"
    const slugKey = `${existing.category}:${existing.slug}`;
    bySlug.set(slugKey, existing);
  }

  console.log(`Processing ${defs.length} provider definitions...`);
  const toInsert: Array<typeof providers.$inferInsert> = [];
  const toUpdate: Array<{
    id: string;
    name: string;
    slug: string;
    source: "catalog";
    domain: string | null;
  }> = [];

  for (const def of defs) {
    const slug = slugify(def.name);
    const lowerDomain = def.domain ? def.domain.toLowerCase() : null;

    // Check domain match first (for promoting discovered records)
    let existing: (typeof allExisting)[number] | undefined;
    if (lowerDomain) {
      const domainKey = `${def.category}:${lowerDomain}`;
      const domainMatches = byDomain.get(domainKey) || [];
      // Only match discovered records OR records with matching slug
      existing = domainMatches.find(
        (r) => r.source === "discovered" || r.slug === slug,
      );
    }

    // Fall back to slug match
    if (!existing) {
      const slugKey = `${def.category}:${slug}`;
      existing = bySlug.get(slugKey);
    }

    if (!existing) {
      // New record - queue for insert
      toInsert.push({
        name: def.name,
        domain: lowerDomain,
        category: def.category,
        slug,
        source: "catalog",
      });
      inserted++;
    } else {
      // Existing record - check if update is needed
      const needsUpdate =
        existing.name !== def.name ||
        existing.slug !== slug ||
        existing.source !== "catalog" ||
        existing.domain !== lowerDomain;

      if (needsUpdate) {
        // Check if updating the slug would create a conflict with another record
        const targetSlugKey = `${def.category}:${slug}`;
        const conflictingRecord = bySlug.get(targetSlugKey);

        if (conflictingRecord && conflictingRecord.id !== existing.id) {
          // Conflict: another record already has this (category, slug)
          // Skip this update to avoid violating unique constraint
          console.warn(
            `Skipping update: (${def.category}, ${slug}) already exists in a different record`,
          );
        } else {
          toUpdate.push({
            id: existing.id,
            name: def.name,
            slug,
            source: "catalog",
            domain: lowerDomain,
          });
          updated++;
        }
      }
    }
  }

  // Batch insert new providers
  if (toInsert.length > 0) {
    console.log(`Inserting ${toInsert.length} new providers...`);
    await db.insert(providers).values(toInsert);
  }

  // Batch update existing providers
  if (toUpdate.length > 0) {
    console.log(`Updating ${toUpdate.length} providers...`);
    for (const update of toUpdate) {
      await db
        .update(providers)
        .set({
          name: update.name,
          slug: update.slug,
          source: update.source,
          domain: update.domain,
          updatedAt: sql`now()`,
        })
        .where(eq(providers.id, update.id));
    }
  }

  console.log(`Seeded ${inserted} inserted, ${updated} updated`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
