import "server-only";
import type { InferInsertModel } from "drizzle-orm";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { registrationNameservers, registrations } from "@/server/db/schema";
import {
  RegistrationInsert as RegistrationInsertSchema,
  RegistrationNameserverInsert as RegistrationNameserverInsertSchema,
  RegistrationUpdate as RegistrationUpdateSchema,
} from "@/server/db/zod";

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

    for (const n of ns) {
      const host = n.host.trim().toLowerCase();
      const nsInsert = RegistrationNameserverInsertSchema.parse({
        domainId,
        host,
        ipv4: (n.ipv4 ?? []) as string[],
        ipv6: (n.ipv6 ?? []) as string[],
      });
      await tx
        .insert(registrationNameservers)
        .values(nsInsert)
        .onConflictDoUpdate({
          target: [
            registrationNameservers.domainId,
            registrationNameservers.host,
          ],
          set: {
            ipv4: (n.ipv4 ?? []) as string[],
            ipv6: (n.ipv6 ?? []) as string[],
          },
        });
    }
  });
}
