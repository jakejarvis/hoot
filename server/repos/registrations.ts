import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { registrationNameservers, registrations } from "@/server/db/schema";

export type UpsertRegistrationParams = {
  domainId: string;
  isRegistered: boolean;
  registry: string | null;
  creationDate?: Date | null;
  updatedDate?: Date | null;
  expirationDate?: Date | null;
  deletionDate?: Date | null;
  transferLock?: boolean | null;
  statuses?: unknown[];
  contacts?: Record<string, unknown>;
  whoisServer?: string | null;
  rdapServers?: string[];
  source: string; // 'rdap' | 'whois'
  registrarProviderId?: string | null;
  resellerProviderId?: string | null;
  fetchedAt: Date;
  expiresAt: Date;
  nameservers?: { host: string; ipv4?: string[]; ipv6?: string[] }[];
};

export async function upsertRegistration(params: UpsertRegistrationParams) {
  const { domainId, nameservers: ns, ...rest } = params;
  await db
    .insert(registrations)
    .values({ domainId, ...rest })
    .onConflictDoUpdate({
      target: registrations.domainId,
      set: { ...rest },
    });

  if (ns) {
    // Replace-set semantics for nameservers
    const existing = await db
      .select({
        id: registrationNameservers.id,
        host: registrationNameservers.host,
      })
      .from(registrationNameservers)
      .where(eq(registrationNameservers.domainId, domainId));

    const nextByHost = new Map(ns.map((n) => [n.host.toLowerCase(), n]));
    const toDelete = existing
      .filter((e) => !nextByHost.has(e.host.toLowerCase()))
      .map((e) => e.id);

    if (toDelete.length > 0) {
      await db
        .delete(registrationNameservers)
        .where(inArray(registrationNameservers.id, toDelete));
    }

    for (const n of ns) {
      await db
        .insert(registrationNameservers)
        .values({
          domainId,
          host: n.host,
          ipv4: (n.ipv4 ?? []) as unknown as Record<string, unknown>[],
          ipv6: (n.ipv6 ?? []) as unknown as Record<string, unknown>[],
        })
        .onConflictDoUpdate({
          target: [
            registrationNameservers.domainId,
            registrationNameservers.host,
          ],
          set: {
            ipv4: (n.ipv4 ?? []) as unknown as Record<string, unknown>[],
            ipv6: (n.ipv6 ?? []) as unknown as Record<string, unknown>[],
          },
        });
    }
  }
}
