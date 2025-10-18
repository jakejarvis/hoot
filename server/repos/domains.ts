import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { domains } from "@/server/db/schema";

export type UpsertDomainParams = {
  name: string; // punycode lowercased
  tld: string;
  unicodeName: string;
};

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

export async function findDomainByName(name: string) {
  const rows = await db
    .select()
    .from(domains)
    .where(eq(domains.name, name))
    .limit(1);
  return rows[0] ?? null;
}
