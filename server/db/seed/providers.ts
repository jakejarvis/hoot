import {
  CA_PROVIDERS,
  DNS_PROVIDERS,
  EMAIL_PROVIDERS,
  HOSTING_PROVIDERS,
  REGISTRAR_PROVIDERS,
} from "@/lib/providers/catalog";
import { db } from "@/server/db/client";
import { type providerCategory, providers } from "@/server/db/schema";

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
  for (const def of defs) {
    const slug = slugify(def.name);
    await db
      .insert(providers)
      .values({
        name: def.name,
        domain: def.domain ?? undefined,
        category: def.category,
        slug,
      })
      .onConflictDoNothing({ target: [providers.category, providers.slug] });
  }
  console.log(`Seeded ${defs.length} provider rows (existing skipped).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
