import { eq } from "drizzle-orm";
import { getDomainTld, lookup } from "rdapper";
import { captureServer } from "@/lib/analytics/server";
import { db } from "@/lib/db/client";
import { upsertDomain } from "@/lib/db/repos/domains";
import { resolveOrCreateProviderId } from "@/lib/db/repos/providers";
import { upsertRegistration } from "@/lib/db/repos/registrations";
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
 * Fetch domain registration using rdapper and cache the normalized DomainRecord.
 */
export async function getRegistration(domain: string): Promise<Registration> {
  const startedAt = Date.now();
  console.debug("[registration] start", { domain });

  // Try current snapshot
  const registrable = toRegistrableDomain(domain);
  const d = registrable
    ? await upsertDomain({
        name: registrable,
        tld: getDomainTld(registrable) ?? "",
        unicodeName: domain,
      })
    : null;
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
        name: "Unknown",
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

      await captureServer("registration_lookup", {
        domain: registrable ?? domain,
        outcome: row.isRegistered ? "ok" : "unregistered",
        cached: true,
        duration_ms: Date.now() - startedAt,
        source: row.source,
      });
      console.info("[registration] ok (cached)", {
        domain: registrable ?? domain,
        registered: row.isRegistered,
        registrar: registrarProvider.name,
        duration_ms: Date.now() - startedAt,
      });

      return response;
    }
  }

  const { ok, record, error } = await lookup(registrable ?? domain, {
    timeoutMs: 5000,
  });

  if (!ok || !record) {
    console.warn("[registration] error", {
      domain: registrable ?? domain,
      error: error || "unknown",
    });
    await captureServer("registration_lookup", {
      domain: registrable ?? domain,
      outcome: "error",
      cached: false,
      error: error || "unknown",
    });
    throw new Error(error || "Registration lookup failed");
  }

  // Log raw rdapper record for observability (safe; already public data)
  console.debug("[registration] rdapper result", {
    ...record,
  });

  let registrarName = (record.registrar?.name || "").toString();
  let registrarDomain: string | null = null;
  const det = detectRegistrar(registrarName);
  if (det.name !== "Unknown") {
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
      name: registrarName.trim() || "Unknown",
      domain: registrarDomain,
    },
  };

  // Persist snapshot
  if (d) {
    const fetchedAt = new Date();
    const registrarProviderId = await resolveOrCreateProviderId({
      category: "registrar",
      domain: registrarDomain,
      name: registrarName,
    });
    const expiresAt = ttlForRegistration(
      fetchedAt,
      record.isRegistered,
      record.expirationDate ? new Date(record.expirationDate) : null,
    );
    await upsertRegistration({
      domainId: d.id,
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
        registrable ?? domain,
        expiresAt.getTime(),
      );
    } catch (err) {
      console.warn("[registration] schedule failed", {
        domain: registrable ?? domain,
        error: (err as Error)?.message,
      });
    }
  }
  await captureServer("registration_lookup", {
    domain: registrable ?? domain,
    outcome: record.isRegistered ? "ok" : "unregistered",
    cached: false,
    duration_ms: Date.now() - startedAt,
    source: record.source,
  });
  console.info("[registration] ok", {
    domain: registrable ?? domain,
    registered: record.isRegistered,
    registrar: withProvider.registrarProvider.name,
    duration_ms: Date.now() - startedAt,
  });

  return withProvider;
}
