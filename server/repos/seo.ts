import "server-only";
import type { InferInsertModel } from "drizzle-orm";
import { db } from "@/server/db/client";
import { seo as seoTable } from "@/server/db/schema";

type SeoInsert = InferInsertModel<typeof seoTable>;

export async function upsertSeo(params: SeoInsert) {
  await db.insert(seoTable).values(params).onConflictDoUpdate({
    target: seoTable.domainId,
    set: params,
  });
}
