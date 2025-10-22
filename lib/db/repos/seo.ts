import "server-only";
import type { InferInsertModel } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { seo as seoTable } from "@/lib/db/schema";
import { SeoRowInsert as SeoRowInsertSchema } from "@/lib/db/zod";

type SeoInsert = InferInsertModel<typeof seoTable>;

export async function upsertSeo(params: SeoInsert) {
  const insertRow = SeoRowInsertSchema.parse(params);
  await db.insert(seoTable).values(insertRow).onConflictDoUpdate({
    target: seoTable.domainId,
    set: insertRow,
  });
}
