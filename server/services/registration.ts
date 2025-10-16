import { eq } from "drizzle-orm";
import { lookupDomain } from "rdapper";
import { captureServer } from "@/lib/analytics/server";
import { toRegistrableDomain } from "@/lib/domain-server";
import { detectRegistrar } from "@/lib/providers/detection";
import type { Registration } from "@/lib/schemas";
import { db } from "@/server/db/client";
import { registrations } from "@/server/db/schema";
import { ttlForRegistration } from "@/server/db/ttl";
import { upsertDomain } from "@/server/repos/domains";
import { resolveProviderId } from "@/server/repos/providers";
import { upsertRegistration } from "@/server/repos/registrations";

/**
 * Fetch domain registration using rdapper and cache the normalized DomainRecord.
 */
// Type exported from schemas; keep alias for local file consumers if any

export async function getRegistration(domain: string): Promise<Registration> {
  const startedAt = Date.now();
  console.debug("[registration] start", { domain });

  const registrable = toRegistrableDomain(domain);
  if (!registrable) throw new Error("Invalid domain");

  // Try current snapshot
  const d = await upsertDomain({
    name: registrable.toLowerCase(),
    tld: registrable.split(".").pop() as string,
    punycodeName: registrable.toLowerCase(),
    unicodeName: registrable,
    isIdn: /xn--/.test(registrable),
  });
  const existing = await db
    .select()
    .from(registrations)
    .where(eq(registrations.domainId, d.id))
    .limit(1);
  const now = new Date();
  if (existing[0] && existing[0].expiresAt > now) {
    // TODO: assemble full response from DB snapshot (follow-up)
  }

  const { ok, record, error } = await lookupDomain(registrable, {
    timeoutMs: 5000,
  });

  if (!ok || !record) {
    console.warn("[registration] error", {
      domain: registrable,
      error: error || "unknown",
    });
    await captureServer("registration_lookup", {
      domain: registrable,
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
  const registrarProviderId = await resolveProviderId({
    category: "registrar",
    domain: registrarDomain,
    name: registrarName,
  });
  const expiresAt = ttlForRegistration(
    now,
    record.isRegistered,
    record.expirationDate ? new Date(record.expirationDate) : null,
  );
  await upsertRegistration({
    domainId: d.id,
    isRegistered: record.isRegistered,
    registry: record.registry ?? null,
    creationDate: record.creationDate ? new Date(record.creationDate) : null,
    updatedDate: record.updatedDate ? new Date(record.updatedDate) : null,
    expirationDate: record.expirationDate
      ? new Date(record.expirationDate)
      : null,
    deletionDate: record.deletionDate ? new Date(record.deletionDate) : null,
    transferLock: record.transferLock ?? null,
    statuses: record.statuses ?? [],
    contacts: { contacts: record.contacts ?? [] },
    whoisServer: record.whoisServer ?? null,
    rdapServers: record.rdapServers ?? [],
    source: record.source,
    registrarProviderId,
    resellerProviderId: null,
    fetchedAt: now,
    expiresAt,
    nameservers: (record.nameservers ?? []).map((n) => ({
      host: n.host,
      ipv4: n.ipv4 ?? [],
      ipv6: n.ipv6 ?? [],
    })),
  });
  await captureServer("registration_lookup", {
    domain: registrable,
    outcome: record.isRegistered ? "ok" : "unregistered",
    cached: false,
    duration_ms: Date.now() - startedAt,
    source: record.source,
  });
  console.info("[registration] ok", {
    domain: registrable,
    registered: record.isRegistered,
    registrar: withProvider.registrarProvider.name,
    duration_ms: Date.now() - startedAt,
  });

  return withProvider;
}
