import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { httpHeaders } from "@/server/db/schema";

export type ReplaceHeadersParams = {
  domainId: string;
  headers: Array<{ name: string; value: string }>;
  fetchedAt: Date;
  expiresAt: Date;
};

export async function replaceHeaders(params: ReplaceHeadersParams) {
  const { domainId, headers, fetchedAt, expiresAt } = params;
  const existing = await db
    .select({ id: httpHeaders.id, name: httpHeaders.name })
    .from(httpHeaders)
    .where(eq(httpHeaders.domainId, domainId));
  // Normalize incoming header names (trim + lowercase) for maps and DB writes
  const normalized = headers.map((h) => ({
    name: h.name.trim().toLowerCase(),
    value: h.value,
  }));
  const nextByName = new Map(normalized.map((h) => [h.name, h]));
  const toDelete = existing
    .filter((e) => {
      const normalizedName = e.name.trim().toLowerCase();
      const existsNext = nextByName.has(normalizedName);
      const needsCaseNormalization = e.name !== normalizedName;
      return !existsNext || needsCaseNormalization;
    })
    .map((e) => e.id);
  if (toDelete.length > 0) {
    await db.delete(httpHeaders).where(inArray(httpHeaders.id, toDelete));
  }
  for (const h of normalized) {
    await db
      .insert(httpHeaders)
      .values({ domainId, name: h.name, value: h.value, fetchedAt, expiresAt })
      .onConflictDoUpdate({
        target: [httpHeaders.domainId, httpHeaders.name],
        set: { value: h.value, fetchedAt, expiresAt },
      });
  }
}
