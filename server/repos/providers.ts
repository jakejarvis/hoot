import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { type providerCategory, providers } from "@/server/db/schema";

export type ResolveProviderInput = {
  category: (typeof providerCategory.enumValues)[number];
  domain?: string | null;
  name?: string | null;
};

/**
 * Resolve a provider id by exact domain when provided, falling back to case-insensitive name.
 */
export async function resolveProviderId(
  input: ResolveProviderInput,
): Promise<string | null> {
  const { category } = input;
  const domain = input.domain?.toLowerCase() ?? null;
  const name = input.name?.trim() ?? null;

  if (domain) {
    const byDomain = await db
      .select({ id: providers.id })
      .from(providers)
      .where(
        and(eq(providers.category, category), eq(providers.domain, domain)),
      )
      .limit(1);
    if (byDomain[0]?.id) return byDomain[0].id;
  }
  if (name) {
    const byName = await db
      .select({ id: providers.id })
      .from(providers)
      .where(
        and(
          eq(providers.category, category),
          sql`lower(${providers.name}) = lower(${name})`,
        ),
      )
      .limit(1);
    if (byName[0]?.id) return byName[0].id;
  }
  return null;
}
