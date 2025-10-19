import "server-only";
import type { InferInsertModel } from "drizzle-orm";
import { db } from "@/server/db/client";
import { seo as seoTable } from "@/server/db/schema";
import { SeoRowInsert as SeoRowInsertSchema } from "@/server/db/zod";

type SeoInsert = InferInsertModel<typeof seoTable>;

export async function upsertSeo(params: SeoInsert) {
  const insertRow = SeoRowInsertSchema.parse(params);
  await db.insert(seoTable).values(insertRow).onConflictDoUpdate({
    target: seoTable.domainId,
    set: insertRow,
  });
}
