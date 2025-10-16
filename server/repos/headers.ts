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
  const nextByName = new Map(headers.map((h) => [h.name.toLowerCase(), h]));
  const toDelete = existing
    .filter((e) => !nextByName.has(e.name.toLowerCase()))
    .map((e) => e.id);
  if (toDelete.length > 0) {
    await db.delete(httpHeaders).where(inArray(httpHeaders.id, toDelete));
  }
  for (const h of headers) {
    await db
      .insert(httpHeaders)
      .values({ domainId, name: h.name, value: h.value, fetchedAt, expiresAt })
      .onConflictDoUpdate({
        target: [httpHeaders.domainId, httpHeaders.name],
        set: { value: h.value, fetchedAt, expiresAt },
      });
  }
}
