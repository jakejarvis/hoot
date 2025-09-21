import { firstResult, whoisDomain } from "whoiser";
import { toRegistrableDomain } from "@/lib/domain-server";
import { mapProviderNameToDomain } from "@/lib/providers/detection";
import { cacheGet, cacheSet, ns } from "@/lib/redis";
import { captureServer } from "@/server/analytics/posthog";
import type { Whois } from "./rdap-parser";

/**
 * Fetch WHOIS data over TCP (port 43) and normalize to our Whois shape.
 * Uses whoiser parser and extracts non-PII fields only.
 */
export async function fetchWhoisTcp(domain: string): Promise<Whois> {
  const registrable = toRegistrableDomain(domain);
  if (!registrable) throw new Error("Invalid domain");

  const key = ns("reg", registrable.toLowerCase());
  const cached = await cacheGet<Whois>(key);
  if (cached) {
    await captureServer("whois_lookup", {
      domain: registrable,
      outcome: "cache_hit",
      cached: true,
    });
    return cached;
  }

  const startedAt = Date.now();
  const results = await whoisDomain(registrable, {
    timeout: 4000,
    follow: 2,
    ignorePrivacy: true,
    raw: false,
  });

  const result: Record<string, unknown> | null = firstResult(results);
  if (!result) {
    // Treat as unregistered/empty
    const empty: Whois = {
      source: "whois",
      registrar: { name: "", domain: null },
      creationDate: "",
      expirationDate: "",
      registrant: { organization: "", country: "" },
      status: [],
      registered: false,
    };
    await cacheSet(key, empty, 60 * 60);
    await captureServer("whois_lookup", {
      domain: registrable,
      outcome: "empty",
      cached: false,
      duration_ms: Date.now() - startedAt,
    });
    return empty;
  }

  const registrar = pickString(result, [
    "Registrar",
    "Sponsoring Registrar",
    "Registrar Name",
  ]);
  const creationDate = pickString(result, [
    "Created Date",
    "Creation Date",
    "registered",
    "Domain record activated",
  ]);
  const expirationDate = pickString(result, [
    "Expiry Date",
    "Expiration Date",
    "expire",
    "Domain expires",
  ]);
  const statusCandidate = (result as Record<string, unknown>)["Domain Status"];
  const statusArr = Array.isArray(statusCandidate)
    ? (statusCandidate.filter((v) => typeof v === "string") as string[])
    : [];

  // Registrant details (best-effort, PII minimized)
  const registrantOrg = pickString(result, [
    "Registrant Organization",
    "Registrant Organisation",
    "owner orgname",
    "Registrant Name",
  ]);
  const registrantCountry = pickString(result, ["Registrant Country"]);
  const registrantState = pickString(result, [
    "Registrant State/Province",
    "Registrant State",
  ]);

  // Heuristic: consider registered if we have dates, registrar, or statuses
  const textCandidate = (result as Record<string, unknown>).text;
  const text = Array.isArray(textCandidate)
    ? (textCandidate.filter((v) => typeof v === "string") as string[])
    : [];
  const errorText = String((result as Record<string, unknown>).error || "");
  const nameServersCandidate = (result as Record<string, unknown>)[
    "Name Server"
  ];
  const hasNameServers = Array.isArray(nameServersCandidate)
    ? nameServersCandidate.length > 0
    : false;
  const notFound =
    errorText.toLowerCase().includes("not found") ||
    text.some((t) => /no match|not found|no entries found/i.test(t));
  const hasSignals = Boolean(
    registrar ||
      creationDate ||
      expirationDate ||
      statusArr.length > 0 ||
      hasNameServers,
  );
  const registered = hasSignals && !notFound;

  const normalized: Whois = {
    source: "whois",
    registrar: {
      name: registrar || "",
      domain: mapProviderNameToDomain(registrar || "") || null,
    },
    creationDate: creationDate || "",
    expirationDate: expirationDate || "",
    registrant: {
      organization: registrantOrg || "",
      country: registrantCountry || "",
      state: registrantState || undefined,
    },
    status: statusArr,
    registered,
  };

  await cacheSet(key, normalized, registered ? 24 * 60 * 60 : 60 * 60);
  await captureServer("whois_lookup", {
    domain: registrable,
    outcome: "ok",
    cached: false,
    duration_ms: Date.now() - startedAt,
  });
  return normalized;
}

function pickString(
  obj: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return undefined;
}
