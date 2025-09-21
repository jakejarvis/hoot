import { toRegistrableDomain } from "@/lib/domain-server";
import { cacheGet, cacheSet, ns } from "@/lib/redis";
import { captureServer } from "@/server/analytics/posthog";
import { getRdapBaseForTld } from "./rdap-bootstrap";
import { parseRdapResponse, type Whois } from "./rdap-parser";
import { fetchWhoisTcp } from "./whois";

type RdapJson = {
  registrar?: { name?: string };
  entities?: RdapEntity[];
  events?: RdapEvent[];
  status?: string[];
};

// Re-export types for backward compatibility
type RdapEvent = { eventAction?: string; eventDate?: string };
type RdapEntity = { roles?: string[]; vcardArray?: [string, unknown[]] };

export async function fetchWhois(domain: string): Promise<Whois> {
  const registrable = toRegistrableDomain(domain);
  if (!registrable) throw new Error("Invalid domain");
  const key = ns("reg", registrable.toLowerCase());
  const cached = await cacheGet<Whois>(key);
  if (cached) return cached;

  try {
    const startedAt = Date.now();
    const rdapBase = await rdapBaseForDomain(registrable);
    if (!rdapBase) {
      // TLD has no RDAP support → go straight to WHOIS
      await captureServer("rdap_lookup", {
        domain: registrable,
        outcome: "bootstrap_missing",
        cached: false,
      });
      return await fetchWhoisTcp(registrable);
    }
    const url = `${rdapBase}/domain/${encodeURIComponent(registrable)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          accept: "application/rdap+json",
          "user-agent": "hoot.sh/0.1 (+https://hoot.sh)",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (res.status === 404) {
      const result: Whois = {
        source: "rdap",
        registrar: { name: "", iconDomain: null },
        creationDate: "",
        expirationDate: "",
        registrant: { organization: "", country: "" },
        status: ["available"],
        registered: false,
      };
      await cacheSet(key, result, 60 * 60);
      await captureServer("rdap_lookup", {
        domain: registrable,
        outcome: "404_unregistered",
        cached: false,
        duration_ms: Date.now() - startedAt,
      });
      return result;
    }

    if (!res.ok) {
      // Fallback to WHOIS on RDAP upstream errors
      await captureServer("rdap_lookup", {
        domain: registrable,
        outcome: "error_fallback",
        cached: false,
        duration_ms: Date.now() - startedAt,
      });
      await captureServer("whois_fallback_triggered", {
        domain: registrable,
        reason: "rdap_error",
      });
      return await fetchWhoisTcp(registrable);
    }

    const json = (await res.json()) as unknown as RdapJson;
    const result = parseRdapResponse(json);
    await cacheSet(key, result, result.registered ? 24 * 60 * 60 : 60 * 60);
    await captureServer("rdap_lookup", {
      domain: registrable,
      outcome: "ok",
      cached: false,
      duration_ms: Date.now() - startedAt,
    });
    return result;
  } catch (_err) {
    // RDAP lookup failed (network/timeout/bootstrap). Fall back to WHOIS.
    await captureServer("rdap_lookup", {
      domain: registrable,
      outcome: "error_fallback",
      cached: false,
    });
    await captureServer("whois_fallback_triggered", {
      domain: registrable,
      reason: "network_or_timeout",
    });
    return await fetchWhoisTcp(registrable);
  }
}

async function rdapBaseForDomain(domain: string): Promise<string | null> {
  const tld = domain.split(".").pop() || "com";
  const base = await getRdapBaseForTld(tld);
  return base;
}
