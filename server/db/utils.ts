import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { domains } from "@/server/db/schema";

export function nowPlusSeconds(sec: number): Date {
  return new Date(Date.now() + sec * 1000);
}

/**
 * Ensure a `domains` row exists and return its id.
 * If not present, inserts a minimal row with `name` and `tld`.
 */
export async function ensureDomainId(
  nameLower: string,
  tld: string,
  opts?: {
    punycodeName?: string | null;
    unicodeName?: string | null;
    isIdn?: boolean;
  },
): Promise<string> {
  const existing = await db.query.domains.findFirst({
    where: (t, { eq }) => eq(t.name, nameLower),
    columns: { id: true },
  });
  if (existing) return existing.id;
  const inserted = await db
    .insert(domains)
    .values({
      name: nameLower,
      tld,
      punycodeName: opts?.punycodeName ?? null,
      unicodeName: opts?.unicodeName ?? null,
      isIdn: Boolean(opts?.isIdn),
    })
    .returning({ id: domains.id });
  return inserted[0]!.id;
}

export async function findDomainId(nameLower: string): Promise<string | null> {
  const existing = await db.query.domains.findFirst({
    where: (t, { eq }) => eq(t.name, nameLower),
    columns: { id: true },
  });
  return existing?.id ?? null;
}
