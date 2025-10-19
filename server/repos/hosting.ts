import "server-only";
import type { InferInsertModel } from "drizzle-orm";
import { db } from "@/server/db/client";
import { hosting as hostingTable } from "@/server/db/schema";
import { HostingRowInsert as HostingRowInsertSchema } from "@/server/db/zod";

type HostingInsert = InferInsertModel<typeof hostingTable>;

export async function upsertHosting(params: HostingInsert) {
  const insertRow = HostingRowInsertSchema.parse(params);
  await db.insert(hostingTable).values(insertRow).onConflictDoUpdate({
    target: hostingTable.domainId,
    set: insertRow,
  });
}
