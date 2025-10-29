import { eq } from "drizzle-orm";
import { getDomainTld, lookup } from "rdapper";
import { db } from "@/lib/db/client";
import { findDomainByName, upsertDomain } from "@/lib/db/repos/domains";
import { resolveOrCreateProviderId } from "@/lib/db/repos/providers";
import {
  getRegistrationStatusFromCache,
  setRegistrationStatusInCache,
  upsertRegistration,
} from "@/lib/db/repos/registrations";
import {
  providers,
  registrationNameservers,
  registrations,
} from "@/lib/db/schema";
import {
  REDIS_TTL_REGISTERED,
  REDIS_TTL_UNREGISTERED,
  ttlForRegistration,
} from "@/lib/db/ttl";
import { toRegistrableDomain } from "@/lib/domain-server";
import { detectRegistrar } from "@/lib/providers/detection";
import { scheduleSectionIfEarlier } from "@/lib/schedule";
import type {
  Registration,
  RegistrationContacts,
  RegistrationSource,
} from "@/lib/schemas";

/**
 * Fetch domain registration using rdapper and cache the normalized DomainRecord.
 */
export async function getRegistration(domain: string): Promise<Registration> {
  console.debug(`[registration] start ${domain}`);

  // Only support registrable domains (no subdomains, IPs, or invalid TLDs)
  const registrable = toRegistrableDomain(domain);
  if (!registrable) {
    throw new Error(`Cannot extract registrable domain from ${domain}`);
  }

  // ===== Fast path 1: Redis cache for registration status =====
  const cachedStatus = await getRegistrationStatusFromCache(registrable);

  // If Redis cache says unregistered, fail fast without checking Postgres
  if (cachedStatus === false) {
    const err = new Error(`Domain ${registrable} is not registered (cached)`);
    console.info(`[registration] cache hit unregistered ${registrable}`);
    throw err;
  }

  // ===== Fast path 2: Postgres cache for full registration data =====
  const existingDomain = await findDomainByName(registrable);
  if (existingDomain) {
    const existing = await db
      .select()
      .from(registrations)
      .where(eq(registrations.domainId, existingDomain.id))
      .limit(1);
    const now = new Date();
    if (existing[0] && existing[0].expiresAt > now) {
      const row = existing[0];

      // Resolve registrar provider details (if present) and nameservers in parallel
      const [prov, ns] = await Promise.all([
        row.registrarProviderId
          ? db
              .select({ name: providers.name, domain: providers.domain })
              .from(providers)
              .where(eq(providers.id, row.registrarProviderId))
              .limit(1)
          : Promise.resolve(
              [] as Array<{ name: string; domain: string | null }>,
            ),
        db
          .select({
            host: registrationNameservers.host,
            ipv4: registrationNameservers.ipv4,
            ipv6: registrationNameservers.ipv6,
          })
          .from(registrationNameservers)
          .where(eq(registrationNameservers.domainId, existingDomain.id)),
      ]);

      const registrarProvider = prov[0]
        ? { name: prov[0].name, domain: prov[0].domain ?? null }
        : { name: null as string | null, domain: null as string | null };

      const contactsArray: RegistrationContacts = row.contacts ?? [];

      const response: Registration = {
        domain: registrable,
        tld: existingDomain.tld,
        isRegistered: row.isRegistered,
        privacyEnabled: row.privacyEnabled ?? false,
        unicodeName: existingDomain.unicodeName,
        punycodeName: existingDomain.name,
        registry: row.registry ?? undefined,
        // registrar object is optional; we don't persist its full details, so omit
        statuses: row.statuses ?? undefined,
        creationDate: row.creationDate?.toISOString(),
        updatedDate: row.updatedDate?.toISOString(),
        expirationDate: row.expirationDate?.toISOString(),
        deletionDate: row.deletionDate?.toISOString(),
        transferLock: row.transferLock ?? undefined,
        nameservers:
          ns.length > 0
            ? ns.map((n) => ({ host: n.host, ipv4: n.ipv4, ipv6: n.ipv6 }))
            : undefined,
        contacts: contactsArray,
        whoisServer: row.whoisServer ?? undefined,
        rdapServers: row.rdapServers ?? undefined,
        source: row.source as RegistrationSource,
        registrarProvider,
      };

      console.info(
        `[registration] ok cached ${registrable} registered=${row.isRegistered} registrar=${registrarProvider.name}`,
      );

      return response;
    }
  }

  // ===== Slow path: Fetch fresh data from WHOIS/RDAP via rdapper =====
  const { ok, record, error } = await lookup(registrable, {
    timeoutMs: 5000,
  });

  if (!ok || !record) {
    const err = new Error(
      `Registration lookup failed for ${registrable}: ${error || "unknown error"}`,
    );
    console.error(
      `[registration] error ${registrable}`,
      err instanceof Error ? err : new Error(String(err)),
    );
    throw err;
  }

  // Log raw rdapper record for observability (safe; already public data)
  console.debug(`[registration] rdapper result for ${registrable}`, record);

  // Cache the registration status (true/false) in Redis for fast lookups
  const ttl = record.isRegistered
    ? REDIS_TTL_REGISTERED
    : REDIS_TTL_UNREGISTERED;
  await setRegistrationStatusInCache(registrable, record.isRegistered, ttl);

  // If unregistered, return response without persisting to Postgres
  if (!record.isRegistered) {
    console.info(
      `[registration] ok ${registrable} unregistered (not persisted)`,
    );

    let registrarName = (record.registrar?.name || "").toString();
    let registrarDomain: string | null = null;
    const det = detectRegistrar(registrarName);
    if (det.name) {
      registrarName = det.name;
    }
    if (det.domain) {
      registrarDomain = det.domain;
    }
    try {
      if (!registrarDomain && record.registrar?.url) {
        registrarDomain = new URL(record.registrar.url).hostname || null;
      }
    } catch {}

    return {
      ...record,
      registrarProvider: {
        name: registrarName.trim() || null,
        domain: registrarDomain,
      },
    };
  }

  // ===== Persist registered domain to Postgres =====
  let registrarName = (record.registrar?.name || "").toString();
  let registrarDomain: string | null = null;
  const det = detectRegistrar(registrarName);
  if (det.name) {
    registrarName = det.name;
  }
  if (det.domain) {
    registrarDomain = det.domain;
  }
  try {
    if (!registrarDomain && record.registrar?.url) {
      registrarDomain = new URL(record.registrar.url).hostname || null;
    }
  } catch {}

  const withProvider: Registration = {
    ...record,
    registrarProvider: {
      name: registrarName.trim() || null,
      domain: registrarDomain,
    },
  };

  const fetchedAt = new Date();

  // Upsert domain record and resolve registrar provider in parallel (independent operations)
  const [domainRecord, registrarProviderId] = await Promise.all([
    upsertDomain({
      name: registrable,
      tld: getDomainTld(registrable) ?? "",
      unicodeName: record.unicodeName ?? registrable,
    }),
    resolveOrCreateProviderId({
      category: "registrar",
      domain: registrarDomain,
      name: registrarName,
    }),
  ]);

  const expiresAt = ttlForRegistration(
    fetchedAt,
    record.expirationDate ? new Date(record.expirationDate) : null,
  );

  await upsertRegistration({
    domainId: domainRecord.id,
    isRegistered: record.isRegistered,
    privacyEnabled: record.privacyEnabled ?? false,
    registry: record.registry ?? null,
    creationDate: record.creationDate ? new Date(record.creationDate) : null,
    updatedDate: record.updatedDate ? new Date(record.updatedDate) : null,
    expirationDate: record.expirationDate
      ? new Date(record.expirationDate)
      : null,
    deletionDate: record.deletionDate ? new Date(record.deletionDate) : null,
    transferLock: record.transferLock ?? null,
    statuses: record.statuses ?? [],
    contacts: record.contacts ?? [],
    whoisServer: record.whoisServer ?? null,
    rdapServers: record.rdapServers ?? [],
    source: record.source,
    registrarProviderId,
    resellerProviderId: null,
    fetchedAt,
    expiresAt,
    nameservers: (record.nameservers ?? []).map((n) => ({
      host: n.host,
      ipv4: n.ipv4 ?? [],
      ipv6: n.ipv6 ?? [],
    })),
  });

  // Schedule background revalidation
  try {
    await scheduleSectionIfEarlier(
      "registration",
      registrable,
      expiresAt.getTime(),
    );
  } catch (err) {
    console.warn(
      `[registration] schedule failed for ${registrable}`,
      err instanceof Error ? err : new Error(String(err)),
    );
  }

  console.info(
    `[registration] ok ${registrable} registered=${record.isRegistered} registrar=${withProvider.registrarProvider.name}`,
  );

  return withProvider;
}
