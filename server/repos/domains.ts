import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { domains } from "@/server/db/schema";

export type UpsertDomainParams = {
  name: string; // punycode lowercased
  tld: string;
  punycodeName: string;
  unicodeName: string;
  isIdn: boolean;
};

export async function upsertDomain(params: UpsertDomainParams) {
  const { name, tld, punycodeName, unicodeName, isIdn } = params;
  const existing = await db
    .select()
    .from(domains)
    .where(eq(domains.name, name))
    .limit(1);
  if (existing.length > 0) {
    return existing[0];
  }
  const inserted = await db
    .insert(domains)
    .values({ name, tld, punycodeName, unicodeName, isIdn })
    .returning();
  return inserted[0];
}

export async function findDomainByName(name: string) {
  const rows = await db
    .select()
    .from(domains)
    .where(eq(domains.name, name))
    .limit(1);
  return rows[0] ?? null;
}
