/**
 * Seed providers from catalog into the database.
 *
 * This script syncs the provider catalog to the database by:
 * - Inserting new catalog providers (matched by name/slug)
 * - Updating existing providers to match catalog definitions (matched by name/slug)
 *
 * Providers are matched solely by their slug (derived from name).
 * Multiple providers can share the same domain (e.g., Amazon S3, CloudFront both use aws.amazon.com).
 *
 * Usage:
 *   pnpm db:seed             # Apply changes to database
 *   pnpm db:seed --dry-run   # Preview changes without applying them
 */

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
import { slugify } from "@/lib/slugify";

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
  // Parse command-line arguments
  const isDryRun = process.argv.includes("--dry-run");

  if (isDryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made to the database\n");
  }

  const defs = collect();
  let inserted = 0;
  let updated = 0;

  console.log(`Fetching existing providers...`);
  // Fetch all existing providers at once to avoid N+1 queries
  const allExisting = await db.select().from(providers);

  // Build lookup map for fast slug-based comparison
  const bySlug = new Map<string, (typeof allExisting)[number]>();

  for (const existing of allExisting) {
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

    // Match by slug (name-based matching)
    // The slug (derived from provider name) is the ONLY identifier
    // Domain is NOT unique since multiple services share parent company domains
    // (e.g., Amazon S3, CloudFront, Route 53 all use aws.amazon.com)
    const slugKey = `${def.category}:${slug}`;
    const existing = bySlug.get(slugKey);

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
            `⚠️  Skipping update for "${def.name}": (${def.category}, ${slug}) conflicts with existing record "${conflictingRecord.name}"`,
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
    console.log(
      `${isDryRun ? "[DRY RUN] Would insert" : "Inserting"} ${toInsert.length} new provider(s)...`,
    );
    if (isDryRun) {
      for (const ins of toInsert) {
        console.log(
          `  - ${ins.category}: ${ins.name} (${ins.domain || "no domain"})`,
        );
      }
    } else {
      await db.insert(providers).values(toInsert);
    }
  }

  // Batch update existing providers
  if (toUpdate.length > 0) {
    console.log(
      `${isDryRun ? "[DRY RUN] Would update" : "Updating"} ${toUpdate.length} provider(s)...`,
    );
    if (isDryRun) {
      for (const update of toUpdate) {
        console.log(`  - ${update.name} (${update.domain || "no domain"})`);
      }
    } else {
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
  }

  if (isDryRun) {
    console.log(
      `\n✅ DRY RUN COMPLETE: Would have inserted ${inserted}, updated ${updated}`,
    );
  } else {
    console.log(`\n✅ Seeded ${inserted} inserted, ${updated} updated`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
