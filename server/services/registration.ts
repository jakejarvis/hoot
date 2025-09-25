import { type DomainRecord, lookupDomain } from "rdapper";
import { captureServer } from "@/lib/analytics/server";
import { toRegistrableDomain } from "@/lib/domain-server";
import { cacheGet, cacheSet, ns } from "@/lib/redis";

/**
 * Fetch domain registration using rdapper and cache the normalized DomainRecord.
 */
export async function getRegistration(domain: string): Promise<DomainRecord> {
  const registrable = toRegistrableDomain(domain);
  if (!registrable) throw new Error("Invalid domain");

  const key = ns("reg", registrable.toLowerCase());
  const cached = await cacheGet<DomainRecord>(key);
  if (cached) {
    await captureServer("registration_lookup", {
      domain: registrable,
      outcome: "cache_hit",
      cached: true,
      source: cached.source,
    });
    return cached;
  }

  const startedAt = Date.now();
  const { ok, record, error } = await lookupDomain(registrable, {
    timeoutMs: 15000,
    followWhoisReferral: true,
  });

  if (!ok || !record) {
    await captureServer("registration_lookup", {
      domain: registrable,
      outcome: "error",
      cached: false,
      error: error || "unknown",
    });
    throw new Error(error || "Registration lookup failed");
  }

  const ttl = record.isRegistered ? 24 * 60 * 60 : 60 * 60;
  await cacheSet(key, record, ttl);
  await captureServer("registration_lookup", {
    domain: registrable,
    outcome: record.isRegistered ? "ok" : "unregistered",
    cached: false,
    duration_ms: Date.now() - startedAt,
    source: record.source,
  });

  return record;
}
