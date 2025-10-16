import "server-only";
import type { InferInsertModel } from "drizzle-orm";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { registrationNameservers, registrations } from "@/server/db/schema";

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
  await db.transaction(async (tx) => {
    await tx
      .insert(registrations)
      .values({ domainId, ...rest })
      .onConflictDoUpdate({
        target: registrations.domainId,
        set: { ...rest },
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

    for (const n of ns) {
      const host = n.host.trim().toLowerCase();
      await tx
        .insert(registrationNameservers)
        .values({
          domainId,
          host,
          ipv4: n.ipv4 ?? [],
          ipv6: n.ipv6 ?? [],
        })
        .onConflictDoUpdate({
          target: [
            registrationNameservers.domainId,
            registrationNameservers.host,
          ],
          set: {
            ipv4: n.ipv4 ?? [],
            ipv6: n.ipv6 ?? [],
          },
        });
    }
  });
}
