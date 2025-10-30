import "server-only";
import type { InferInsertModel } from "drizzle-orm";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { dnsRecords, type dnsRecordType } from "@/lib/db/schema";
import { DnsRecordInsert as DnsRecordInsertSchema } from "@/lib/db/zod";

type DnsRecordInsert = InferInsertModel<typeof dnsRecords>;

export type UpsertDnsParams = {
  domainId: string;
  resolver: string;
  fetchedAt: Date;
  // complete set per type
  recordsByType: Record<
    (typeof dnsRecordType.enumValues)[number],
    Array<
      Omit<
        DnsRecordInsert,
        "id" | "domainId" | "type" | "resolver" | "fetchedAt"
      >
    >
  >;
};

export async function replaceDns(params: UpsertDnsParams) {
  const { domainId, recordsByType } = params;

  // Fetch all existing records for all types in a single query
  const allExisting = await db
    .select({
      id: dnsRecords.id,
      type: dnsRecords.type,
      name: dnsRecords.name,
      value: dnsRecords.value,
    })
    .from(dnsRecords)
    .where(eq(dnsRecords.domainId, domainId));

  // Build a map of existing records for quick lookup
  const existingMap = new Map<string, string>();
  for (const record of allExisting) {
    const key = `${record.type}|${record.name.trim().toLowerCase()}|${record.value.trim().toLowerCase()}`;
    existingMap.set(key, record.id);
  }

  // Collect all records to upsert and records to delete
  const allRecordsToUpsert: ReturnType<typeof DnsRecordInsertSchema.parse>[] =
    [];

  const allNextKeys = new Set<string>();

  for (const type of Object.keys(recordsByType) as Array<
    (typeof dnsRecordType.enumValues)[number]
  >) {
    const next = (recordsByType[type] ?? []).map((r) => ({
      ...r,
      type,
      // Normalize DNS record name/value for case-insensitive uniqueness
      name: (r.name as string).trim().toLowerCase(),
      value: (r.value as string).trim().toLowerCase(),
    }));

    for (const r of next) {
      const key = `${type}|${r.name}|${r.value}`;
      allNextKeys.add(key);

      allRecordsToUpsert.push(
        DnsRecordInsertSchema.parse({
          domainId,
          type,
          name: r.name,
          value: r.value,
          ttl: r.ttl ?? null,
          priority: r.priority ?? null,
          isCloudflare: r.isCloudflare ?? null,
          resolver: params.resolver,
          fetchedAt: params.fetchedAt,
          expiresAt: r.expiresAt,
        }),
      );
    }
  }

  // Identify records to delete (exist in DB but not in the new set)
  const idsToDelete = allExisting
    .filter((e) => {
      const key = `${e.type}|${e.name.trim().toLowerCase()}|${e.value.trim().toLowerCase()}`;
      return !allNextKeys.has(key);
    })
    .map((e) => e.id);

  // Delete obsolete records
  if (idsToDelete.length > 0) {
    await db.delete(dnsRecords).where(inArray(dnsRecords.id, idsToDelete));
  }

  // Batch upsert all records
  if (allRecordsToUpsert.length > 0) {
    await db
      .insert(dnsRecords)
      .values(allRecordsToUpsert)
      .onConflictDoUpdate({
        target: [
          dnsRecords.domainId,
          dnsRecords.type,
          dnsRecords.name,
          dnsRecords.value,
        ],
        set: {
          ttl: sql`excluded.${sql.identifier(dnsRecords.ttl.name)}`,
          priority: sql`excluded.${sql.identifier(dnsRecords.priority.name)}`,
          isCloudflare: sql`excluded.${sql.identifier(dnsRecords.isCloudflare.name)}`,
          resolver: sql`excluded.${sql.identifier(dnsRecords.resolver.name)}`,
          fetchedAt: sql`excluded.${sql.identifier(dnsRecords.fetchedAt.name)}`,
          expiresAt: sql`excluded.${sql.identifier(dnsRecords.expiresAt.name)}`,
        },
      });
  }
}
