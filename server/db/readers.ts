import "server-only";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  certificates,
  dnsRecords,
  domainAssets,
  domains,
  hosting,
  httpHeaders,
  registrationNameservers,
  registrations,
  seo,
} from "@/server/db/schema";

export async function readDomainIdByName(
  nameLower: string,
): Promise<string | null> {
  const row = await db.query.domains.findFirst({
    where: (t, { eq }) => eq(t.name, nameLower),
    columns: { id: true },
  });
  return row?.id ?? null;
}

export async function readRegistration(domainId: string) {
  return await db.query.registrations.findFirst({
    where: (t, { eq }) => eq(t.domainId, domainId),
  });
}

export async function readRegistrationNameservers(domainId: string) {
  return await db
    .select()
    .from(registrationNameservers)
    .where(eq(registrationNameservers.domainId, domainId));
}

export async function readDnsRecords(domainId: string) {
  return await db.query.dnsRecords.findMany({
    where: (t, { eq }) => eq(t.domainId, domainId),
  });
}

export async function readCertificates(domainId: string) {
  return await db.query.certificates.findMany({
    where: (t, { eq }) => eq(t.domainId, domainId),
  });
}

export async function readHeaders(domainId: string) {
  return await db.query.httpHeaders.findMany({
    where: (t, { eq }) => eq(t.domainId, domainId),
  });
}

export async function readHosting(domainId: string) {
  return await db.query.hosting.findFirst({
    where: (t, { eq }) => eq(t.domainId, domainId),
  });
}

export async function readSeo(domainId: string) {
  return await db.query.seo.findFirst({
    where: (t, { eq }) => eq(t.domainId, domainId),
  });
}

export async function readFavicon(domainId: string) {
  const row = await db
    .select({
      url: domains.faviconUrl,
      key: domains.faviconKey,
      expiresAt: domains.faviconExpiresAt,
    })
    .from(domains)
    .where(eq(domains.id, domainId))
    .limit(1);
  return row[0] ?? null;
}

export async function readScreenshot(
  domainId: string,
  width: number,
  height: number,
  variant = "default",
) {
  const rows = await db
    .select()
    .from(domainAssets)
    .where(
      and(
        eq(domainAssets.domainId, domainId),
        eq(domainAssets.kind, "screenshot"),
        eq(domainAssets.variant, variant),
        eq(domainAssets.width, width),
        eq(domainAssets.height, height),
      ),
    )
    .orderBy(desc(domainAssets.updatedAt))
    .limit(1);
  return rows[0] ?? null;
}
