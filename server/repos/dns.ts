import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  dnsRecords,
  type dnsRecordType,
  type dnsResolver,
} from "@/server/db/schema";

export type UpsertDnsParams = {
  domainId: string;
  resolver: (typeof dnsResolver.enumValues)[number];
  fetchedAt: Date;
  // complete set per type
  recordsByType: Record<
    (typeof dnsRecordType.enumValues)[number],
    Array<{
      name: string;
      value: string;
      ttl?: number | null;
      priority?: number | null;
      isCloudflare?: boolean | null;
      expiresAt: Date;
    }>
  >;
};

export async function replaceDns(params: UpsertDnsParams) {
  const { domainId, recordsByType } = params;
  // For each type, compute replace-set by (type,name,value)
  for (const type of Object.keys(recordsByType) as Array<
    (typeof dnsRecordType.enumValues)[number]
  >) {
    const next = recordsByType[type] ?? [];
    const existing = await db
      .select({
        id: dnsRecords.id,
        name: dnsRecords.name,
        value: dnsRecords.value,
      })
      .from(dnsRecords)
      .where(and(eq(dnsRecords.domainId, domainId), eq(dnsRecords.type, type)));
    const nextKey = (r: (typeof next)[number]) =>
      `${type as string}|${r.name.toLowerCase()}|${r.value.toLowerCase()}`;
    const nextMap = new Map(next.map((r) => [nextKey(r), r]));
    const toDelete = existing
      .filter(
        (e) =>
          !nextMap.has(
            `${type}|${e.name.toLowerCase()}|${e.value.toLowerCase()}`,
          ),
      )
      .map((e) => e.id);
    if (toDelete.length > 0) {
      await db.delete(dnsRecords).where(inArray(dnsRecords.id, toDelete));
    }
    for (const r of next) {
      await db
        .insert(dnsRecords)
        .values({
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
        })
        .onConflictDoUpdate({
          target: [
            dnsRecords.domainId,
            dnsRecords.type,
            dnsRecords.name,
            dnsRecords.value,
          ],
          set: {
            ttl: r.ttl ?? null,
            priority: r.priority ?? null,
            isCloudflare: r.isCloudflare ?? null,
            resolver: params.resolver,
            fetchedAt: params.fetchedAt,
            expiresAt: r.expiresAt,
          },
        });
    }
  }
}
