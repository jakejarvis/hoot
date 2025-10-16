import { lookupDomain } from "rdapper";
import { captureServer } from "@/lib/analytics/server";
import { toRegistrableDomain } from "@/lib/domain-server";
import { detectRegistrar } from "@/lib/providers/detection";
import { ns, redis } from "@/lib/redis";
import type { Registration } from "@/lib/schemas";
import { persistRegistrationToDb } from "@/server/services/registration-db";

/**
 * Fetch domain registration using rdapper and cache the normalized DomainRecord.
 */
// Type exported from schemas; keep alias for local file consumers if any

export async function getRegistration(domain: string): Promise<Registration> {
  const startedAt = Date.now();
  console.debug("[registration] start", { domain });

  const registrable = toRegistrableDomain(domain);
  if (!registrable) throw new Error("Invalid domain");

  const key = ns("reg", registrable.toLowerCase());
  const cached = await redis.get<Registration>(key);
  if (cached) {
    console.info("[registration] cache hit", { domain: registrable });
    return cached;
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

  const ttl = record.isRegistered ? 24 * 60 * 60 : 60 * 60;
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

  await redis.set(key, withProvider, { ex: ttl });
  try {
    await persistRegistrationToDb(registrable, withProvider);
  } catch {}
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
