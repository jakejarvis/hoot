import "server-only";
import type { InferInsertModel } from "drizzle-orm";
import { db } from "@/server/db/client";
import { hosting as hostingTable } from "@/server/db/schema";

type HostingInsert = InferInsertModel<typeof hostingTable>;

export async function upsertHosting(params: HostingInsert) {
  await db.insert(hostingTable).values(params).onConflictDoUpdate({
    target: hostingTable.domainId,
    set: params,
  });
}
