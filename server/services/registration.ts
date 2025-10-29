import { eq } from "drizzle-orm";
import { getDomainTld, lookup } from "rdapper";
import { REDIS_TTL_REGISTERED, REDIS_TTL_UNREGISTERED } from "@/lib/constants";
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
import { ttlForRegistration } from "@/lib/db/ttl";
import { toRegistrableDomain } from "@/lib/domain-server";
import { detectRegistrar } from "@/lib/providers/detection";
import { scheduleSectionIfEarlier } from "@/lib/schedule";
import type {
  Registration,
  RegistrationContacts,
  RegistrationSource,
} from "@/lib/schemas";

/**
 * Normalize registrar provider information from raw rdapper data.
 * Applies provider detection and falls back to URL hostname parsing.
 */
function normalizeRegistrar(registrar?: { name?: unknown; url?: unknown }): {
  name: string | null;
  domain: string | null;
} {
  let registrarName = (registrar?.name || "").toString();
  let registrarDomain: string | null = null;

  // Run provider detection to normalize known registrars
  const det = detectRegistrar(registrarName);
  if (det.name) {
    registrarName = det.name;
  }
  if (det.domain) {
    registrarDomain = det.domain;
  }

  // Fall back to URL hostname parsing if domain is still unknown
  try {
    if (!registrarDomain && registrar?.url) {
      registrarDomain = new URL(registrar.url.toString()).hostname || null;
    }
  } catch {
    // URL parsing failed, leave domain as null
  }

  return {
    name: registrarName.trim() || null,
    domain: registrarDomain,
  };
}

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

  // If Redis cache says unregistered, return minimal Registration object
  if (cachedStatus === false) {
    console.info(`[registration] cache hit unregistered ${registrable}`);
    return {
      domain: registrable,
      tld: getDomainTld(registrable) ?? "",
      isRegistered: false,
      source: "rdap" as const,
      registrarProvider: {
        name: null,
        domain: null,
      },
    };
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

      // Update Redis fast-path cache to keep it hot for subsequent requests
      // Fire-and-forget to avoid blocking the response on Redis latency
      const ttl = row.isRegistered
        ? REDIS_TTL_REGISTERED
        : REDIS_TTL_UNREGISTERED;
      setRegistrationStatusInCache(registrable, row.isRegistered, ttl).catch(
        (err) => {
          console.warn(
            `[registration] failed to warm Redis cache for ${registrable}:`,
            err instanceof Error ? err : new Error(String(err)),
          );
        },
      );

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
  // Fire-and-forget to avoid blocking the response on Redis latency
  const ttl = record.isRegistered
    ? REDIS_TTL_REGISTERED
    : REDIS_TTL_UNREGISTERED;
  setRegistrationStatusInCache(registrable, record.isRegistered, ttl).catch(
    (err) => {
      console.warn(
        `[registration] failed to cache status for ${registrable}:`,
        err instanceof Error ? err : new Error(String(err)),
      );
    },
  );

  // If unregistered, return response without persisting to Postgres
  if (!record.isRegistered) {
    console.info(
      `[registration] ok ${registrable} unregistered (not persisted)`,
    );

    const registrarProvider = normalizeRegistrar(record.registrar ?? {});

    // Explicitly construct Registration object to avoid leaking rdapper internals
    return {
      domain: record.domain,
      tld: record.tld,
      isRegistered: record.isRegistered,
      unicodeName: record.unicodeName,
      punycodeName: record.punycodeName,
      registry: record.registry,
      registrar: record.registrar,
      reseller: record.reseller,
      statuses: record.statuses,
      creationDate: record.creationDate,
      updatedDate: record.updatedDate,
      expirationDate: record.expirationDate,
      deletionDate: record.deletionDate,
      transferLock: record.transferLock,
      dnssec: record.dnssec,
      nameservers: record.nameservers,
      contacts: record.contacts,
      privacyEnabled: record.privacyEnabled,
      whoisServer: record.whoisServer,
      rdapServers: record.rdapServers,
      source: record.source,
      warnings: record.warnings,
      registrarProvider,
    };
  }

  // ===== Persist registered domain to Postgres =====
  const registrarProvider = normalizeRegistrar(record.registrar ?? {});

  // Explicitly construct Registration object to avoid leaking rdapper internals
  const withProvider: Registration = {
    domain: record.domain,
    tld: record.tld,
    isRegistered: record.isRegistered,
    unicodeName: record.unicodeName,
    punycodeName: record.punycodeName,
    registry: record.registry,
    registrar: record.registrar,
    reseller: record.reseller,
    statuses: record.statuses,
    creationDate: record.creationDate,
    updatedDate: record.updatedDate,
    expirationDate: record.expirationDate,
    deletionDate: record.deletionDate,
    transferLock: record.transferLock,
    dnssec: record.dnssec,
    nameservers: record.nameservers,
    contacts: record.contacts,
    privacyEnabled: record.privacyEnabled,
    whoisServer: record.whoisServer,
    rdapServers: record.rdapServers,
    source: record.source,
    warnings: record.warnings,
    registrarProvider,
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
      domain: registrarProvider.domain,
      name: registrarProvider.name,
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

  // Schedule background revalidation (only for registered domains)
  if (record.isRegistered) {
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
  }

  console.info(
    `[registration] ok ${registrable} registered=${record.isRegistered} registrar=${withProvider.registrarProvider.name}`,
  );

  return withProvider;
}
