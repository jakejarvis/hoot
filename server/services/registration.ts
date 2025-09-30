import { lookupDomain } from "rdapper";
import { captureServer } from "@/lib/analytics/server";
import { toRegistrableDomain } from "@/lib/domain-server";
import { detectRegistrar } from "@/lib/providers/detection";
import { getOrSetZod, ns } from "@/lib/redis";
import { type Registration, RegistrationSchema } from "@/lib/schemas";

/**
 * Fetch domain registration using rdapper and cache the normalized DomainRecord.
 */
// Type exported from schemas; keep alias for local file consumers if any

export async function getRegistration(domain: string): Promise<Registration> {
  const registrable = toRegistrableDomain(domain);
  if (!registrable) throw new Error("Invalid domain");

  const key = ns("reg", registrable.toLowerCase());

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

  await getOrSetZod<Registration>(
    key,
    ttl,
    async () => withProvider,
    RegistrationSchema,
  );
  await captureServer("registration_lookup", {
    domain: registrable,
    outcome: record.isRegistered ? "ok" : "unregistered",
    cached: false,
    duration_ms: Date.now() - startedAt,
    source: record.source,
  });

  return withProvider;
}
