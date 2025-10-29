import "server-only";
import type { InferInsertModel } from "drizzle-orm";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { registrationNameservers, registrations } from "@/lib/db/schema";
import {
  RegistrationInsert as RegistrationInsertSchema,
  RegistrationNameserverInsert as RegistrationNameserverInsertSchema,
  RegistrationUpdate as RegistrationUpdateSchema,
} from "@/lib/db/zod";
import { ns, redis } from "@/lib/redis";

type RegistrationInsert = InferInsertModel<typeof registrations>;
type RegistrationNameserverInsert = InferInsertModel<
  typeof registrationNameservers
>;

export async function upsertRegistration(
  params: RegistrationInsert & {
    nameservers?: Array<
      Pick<RegistrationNameserverInsert, "host" | "ipv4" | "ipv6">
    >;
  },
) {
  const { domainId, nameservers: ns, ...rest } = params;
  const insertRow = RegistrationInsertSchema.parse({ domainId, ...rest });
  const updateRow = RegistrationUpdateSchema.parse({ ...rest });
  await db.transaction(async (tx) => {
    await tx.insert(registrations).values(insertRow).onConflictDoUpdate({
      target: registrations.domainId,
      set: updateRow,
    });

    if (!ns) return;
    // Replace-set semantics for nameservers
    const existing = await tx
      .select({
        id: registrationNameservers.id,
        host: registrationNameservers.host,
      })
      .from(registrationNameservers)
      .where(eq(registrationNameservers.domainId, domainId));

    const nextByHost = new Map(ns.map((n) => [n.host.trim().toLowerCase(), n]));
    const toDelete = existing
      .filter((e) => !nextByHost.has(e.host.toLowerCase()))
      .map((e) => e.id);

    if (toDelete.length > 0) {
      await tx
        .delete(registrationNameservers)
        .where(inArray(registrationNameservers.id, toDelete));
    }

    // Batch upsert all nameservers
    if (ns.length > 0) {
      const values = ns.map((n) => {
        const host = n.host.trim().toLowerCase();
        return RegistrationNameserverInsertSchema.parse({
          domainId,
          host,
          ipv4: (n.ipv4 ?? []) as string[],
          ipv6: (n.ipv6 ?? []) as string[],
        });
      });

      await tx
        .insert(registrationNameservers)
        .values(values)
        .onConflictDoUpdate({
          target: [
            registrationNameservers.domainId,
            registrationNameservers.host,
          ],
          set: {
            ipv4: sql`excluded.${sql.identifier(registrationNameservers.ipv4.name)}`,
            ipv6: sql`excluded.${sql.identifier(registrationNameservers.ipv6.name)}`,
          },
        });
    }
  });
}

/**
 * Build the Redis cache key for registration status.
 * This helper ensures consistent key format across the codebase.
 * Normalizes domain by trimming whitespace, removing trailing dots, and lowercasing.
 */
export function getRegistrationCacheKey(domain: string): string {
  // Normalize: trim whitespace, remove trailing dots, then lowercase
  const normalized = (domain || "").trim().replace(/\.+$/, "").toLowerCase();
  return ns("reg", normalized);
}

/**
 * Get cached registration status from Redis.
 * Returns true if registered, false if unregistered, null on cache miss or error.
 */
export async function getRegistrationStatusFromCache(
  domain: string,
): Promise<boolean | null> {
  try {
    const key = getRegistrationCacheKey(domain);
    const value = await redis.get<string>(key);
    if (value === "1") return true;
    if (value === "0") return false;
    return null;
  } catch (err) {
    // Redis failures should not break the flow; log and return null to fall back
    console.warn(
      `[redis] getRegistrationStatusFromCache failed for ${domain}`,
      err instanceof Error ? err : new Error(String(err)),
    );
    return null;
  }
}

/**
 * Set registration status in Redis with TTL.
 */
export async function setRegistrationStatusInCache(
  domain: string,
  isRegistered: boolean,
  ttlSeconds: number,
): Promise<void> {
  // Validate TTL before writing to Redis
  if (
    !Number.isFinite(ttlSeconds) ||
    !Number.isInteger(ttlSeconds) ||
    ttlSeconds <= 0
  ) {
    console.warn(
      `[redis] setRegistrationStatusInCache skipped for ${domain}: invalid TTL ${ttlSeconds}`,
    );
    return;
  }

  try {
    const key = getRegistrationCacheKey(domain);
    const value = isRegistered ? "1" : "0";
    await redis.setex(key, ttlSeconds, value);
  } catch (err) {
    // Log but don't throw; Redis cache failures should not break the flow
    console.warn(
      `[redis] setRegistrationStatusInCache failed for ${domain}`,
      err instanceof Error ? err : new Error(String(err)),
    );
  }
}
