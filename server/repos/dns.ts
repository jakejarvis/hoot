import "server-only";
import type { InferInsertModel } from "drizzle-orm";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  dnsRecords,
  type dnsRecordType,
  type dnsResolver,
} from "@/server/db/schema";
import {
  DnsRecordInsert as DnsRecordInsertSchema,
  DnsRecordUpdate as DnsRecordUpdateSchema,
} from "@/server/db/zod";

type DnsRecordInsert = InferInsertModel<typeof dnsRecords>;

export type UpsertDnsParams = {
  domainId: string;
  resolver: (typeof dnsResolver.enumValues)[number];
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
  // For each type, compute replace-set by (type,name,value)
  for (const type of Object.keys(recordsByType) as Array<
    (typeof dnsRecordType.enumValues)[number]
  >) {
    const next = (recordsByType[type] ?? []).map((r) => ({
      ...r,
      // Normalize DNS record name/value for case-insensitive uniqueness
      name: (r.name as string).trim().toLowerCase(),
      value: (r.value as string).trim().toLowerCase(),
    }));
    const existing = await db
      .select({
        id: dnsRecords.id,
        name: dnsRecords.name,
        value: dnsRecords.value,
      })
      .from(dnsRecords)
      .where(and(eq(dnsRecords.domainId, domainId), eq(dnsRecords.type, type)));
    const nextKey = (r: (typeof next)[number]) =>
      `${type as string}|${r.name as string}|${r.value as string}`;
    const nextMap = new Map(next.map((r) => [nextKey(r), r]));
    const toDelete = existing
      .filter(
        (e) =>
          !nextMap.has(
            `${type}|${e.name.trim().toLowerCase()}|${e.value
              .trim()
              .toLowerCase()}`,
          ),
      )
      .map((e) => e.id);
    if (toDelete.length > 0) {
      await db.delete(dnsRecords).where(inArray(dnsRecords.id, toDelete));
    }
    for (const r of next) {
      const insertRow = DnsRecordInsertSchema.parse({
        domainId,
        type,
        name: r.name as string,
        value: r.value as string,
        ttl: r.ttl ?? null,
        priority: r.priority ?? null,
        isCloudflare: r.isCloudflare ?? null,
        resolver: params.resolver,
        fetchedAt: params.fetchedAt as Date | string,
        expiresAt: r.expiresAt as Date | string,
      });
      const updateSet = DnsRecordUpdateSchema.parse({
        ttl: r.ttl ?? null,
        priority: r.priority ?? null,
        isCloudflare: r.isCloudflare ?? null,
        resolver: params.resolver,
        fetchedAt: params.fetchedAt as Date | string,
        expiresAt: r.expiresAt as Date | string,
      });
      await db
        .insert(dnsRecords)
        .values(insertRow)
        .onConflictDoUpdate({
          target: [
            dnsRecords.domainId,
            dnsRecords.type,
            dnsRecords.name,
            dnsRecords.value,
          ],
          set: updateSet,
        });
    }
  }
}
