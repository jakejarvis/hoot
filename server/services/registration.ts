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

  const registrable = toRegistrableDomain(domain);

  // Step 1: Check Redis for cached registration status
  const cachedStatus = registrable
    ? await getRegistrationStatusFromCache(registrable)
    : null;

  // If Redis says unregistered, fail fast
  if (cachedStatus === false) {
    const err = new Error(
      `Domain ${registrable ?? domain} is not registered (cached)`,
    );
    console.info(
      `[registration] cache hit unregistered ${registrable ?? domain}`,
    );
    throw err;
  }

  // Step 2: Check Postgres for full registration data (if domain exists)
  const d = registrable ? await findDomainByName(registrable) : null;
  if (d) {
    const existing = await db
      .select()
      .from(registrations)
      .where(eq(registrations.domainId, d.id))
      .limit(1);
    const now = new Date();
    if (existing[0] && existing[0].expiresAt > now) {
      const row = existing[0];
      // Resolve registrar provider details if present
      let registrarProvider = {
        name: null as string | null,
        domain: null as string | null,
      };
      if (row.registrarProviderId) {
        const prov = await db
          .select({ name: providers.name, domain: providers.domain })
          .from(providers)
          .where(eq(providers.id, row.registrarProviderId))
          .limit(1);
        if (prov[0]) {
          registrarProvider = {
            name: prov[0].name,
            domain: prov[0].domain ?? null,
          };
        }
      }

      // Load nameservers for this domain
      const ns = await db
        .select({
          host: registrationNameservers.host,
          ipv4: registrationNameservers.ipv4,
          ipv6: registrationNameservers.ipv6,
        })
        .from(registrationNameservers)
        .where(eq(registrationNameservers.domainId, d.id));

      const contactsArray: RegistrationContacts = row.contacts ?? [];

      const response: Registration = {
        domain: registrable as string,
        tld: d.tld,
        isRegistered: row.isRegistered,
        privacyEnabled: row.privacyEnabled ?? false,
        unicodeName: d.unicodeName,
        punycodeName: d.name,
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
        `[registration] ok cached ${registrable ?? domain} registered=${row.isRegistered} registrar=${registrarProvider.name}`,
      );

      return response;
    }
  }

  // Step 3: Call rdapper to fetch fresh data
  const { ok, record, error } = await lookup(registrable ?? domain, {
    timeoutMs: 5000,
  });

  if (!ok || !record) {
    const err = new Error(
      `Registration lookup failed for ${registrable ?? domain}: ${error || "unknown error"}`,
    );
    console.error(
      `[registration] error ${registrable ?? domain}`,
      err instanceof Error ? err : new Error(String(err)),
    );
    throw err;
  }

  // Log raw rdapper record for observability (safe; already public data)
  console.debug(
    `[registration] rdapper result for ${registrable ?? domain}`,
    record,
  );

  // Step 4: Cache registration status in Redis
  if (registrable) {
    const ttl = record.isRegistered
      ? REDIS_TTL_REGISTERED
      : REDIS_TTL_UNREGISTERED;
    await setRegistrationStatusInCache(registrable, record.isRegistered, ttl);
  }

  // Step 5: If unregistered, return early without persisting
  if (!record.isRegistered) {
    console.info(
      `[registration] ok ${registrable ?? domain} unregistered (not persisted)`,
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

  // Step 6: For registered domains, persist to Postgres
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

  // Create domain record and persist registration snapshot
  if (registrable) {
    const domainRecord = await upsertDomain({
      name: registrable,
      tld: getDomainTld(registrable) ?? "",
      unicodeName: domain,
    });

    const fetchedAt = new Date();
    const registrarProviderId = await resolveOrCreateProviderId({
      category: "registrar",
      domain: registrarDomain,
      name: registrarName,
    });
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
    `[registration] ok ${registrable ?? domain} registered=${record.isRegistered} registrar=${withProvider.registrarProvider.name}`,
  );

  return withProvider;
}
