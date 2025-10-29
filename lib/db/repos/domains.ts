import "server-only";

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { domains } from "@/lib/db/schema";

export type UpsertDomainParams = {
  name: string; // punycode lowercased
  tld: string;
  unicodeName: string;
};

/**
 * Insert a new domain record or return the existing one if it already exists.
 * Used when persisting data for a registered domain.
 */
export async function upsertDomain(params: UpsertDomainParams) {
  const { name, tld, unicodeName } = params;

  const inserted = await db
    .insert(domains)
    .values({ name, tld, unicodeName })
    .onConflictDoNothing({ target: [domains.name] })
    .returning();
  if (inserted[0]) return inserted[0];

  const rows = await db
    .select()
    .from(domains)
    .where(eq(domains.name, name))
    .limit(1);
  return rows[0];
}

/**
 * Find an existing domain record by name.
 * Returns null if the domain doesn't exist (typically means unregistered).
 */
export async function findDomainByName(name: string) {
  const rows = await db
    .select()
    .from(domains)
    .where(eq(domains.name, name))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Update the lastAccessedAt timestamp for a domain by name.
 * Used to track domain access for pruning stale revalidation tasks.
 */
export async function updateLastAccessed(name: string): Promise<void> {
  try {
    await db
      .update(domains)
      .set({ lastAccessedAt: new Date() })
      .where(eq(domains.name, name));
  } catch (err) {
    // Non-critical: log but don't fail the request
    console.debug(
      `[domains] failed to update lastAccessedAt for ${name}`,
      err instanceof Error ? err : new Error(String(err)),
    );
  }
}

/**
 * Increment the change frequency counter for a domain.
 * Called by services when they detect data has changed during revalidation.
 * Used for adaptive TTL calculation.
 */
export async function incrementChangeFrequency(name: string): Promise<void> {
  try {
    await db
      .update(domains)
      .set({ changeFrequency: sql`${domains.changeFrequency} + 1` })
      .where(eq(domains.name, name));
  } catch (err) {
    // Non-critical: log but don't fail the request
    console.debug(
      `[domains] failed to increment changeFrequency for ${name}`,
      err instanceof Error ? err : new Error(String(err)),
    );
  }
}

/**
 * Get the change frequency for a domain.
 * Returns 0 if domain not found or no change frequency set.
 */
export async function getChangeFrequency(name: string): Promise<number> {
  try {
    const rows = await db
      .select({ changeFrequency: domains.changeFrequency })
      .from(domains)
      .where(eq(domains.name, name))
      .limit(1);
    return rows[0]?.changeFrequency ?? 0;
  } catch {
    return 0;
  }
}
