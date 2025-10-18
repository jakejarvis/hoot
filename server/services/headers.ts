import { eq } from "drizzle-orm";
import { getDomainTld } from "rdapper";
import { captureServer } from "@/lib/analytics/server";
import { toRegistrableDomain } from "@/lib/domain-server";
import { fetchWithTimeout } from "@/lib/fetch";
import type { HttpHeader } from "@/lib/schemas";
import { db } from "@/server/db/client";
import { httpHeaders } from "@/server/db/schema";
import { ttlForHeaders } from "@/server/db/ttl";
import { upsertDomain } from "@/server/repos/domains";
import { replaceHeaders } from "@/server/repos/headers";

export async function probeHeaders(domain: string): Promise<HttpHeader[]> {
  const url = `https://${domain}/`;
  console.debug("[headers] start", { domain });
  // Fast path: read from Postgres if fresh
  const registrable = toRegistrableDomain(domain);
  const d = registrable
    ? await upsertDomain({
        name: registrable,
        tld: getDomainTld(registrable) as string,
        punycodeName: registrable,
        unicodeName: domain,
      })
    : null;
  const existing = d
    ? await db
        .select({
          name: httpHeaders.name,
          value: httpHeaders.value,
          expiresAt: httpHeaders.expiresAt,
        })
        .from(httpHeaders)
        .where(eq(httpHeaders.domainId, d.id))
    : ([] as Array<{ name: string; value: string; expiresAt: Date | null }>);
  if (existing.length > 0) {
    const now = Date.now();
    const fresh = existing.every((h) => (h.expiresAt?.getTime?.() ?? 0) > now);
    if (fresh) {
      const normalized = normalize(
        existing.map((h) => ({ name: h.name, value: h.value })),
      );
      console.info("[headers] db hit", {
        domain: registrable,
        count: normalized.length,
      });
      return normalized;
    }
  }

  const REQUEST_TIMEOUT_MS = 5000;
  try {
    // Use GET to ensure provider-identifying headers are present on first load.
    const final = await fetchWithTimeout(
      url,
      { method: "GET", redirect: "follow" },
      { timeoutMs: REQUEST_TIMEOUT_MS },
    );

    const headers: HttpHeader[] = [];
    final.headers.forEach((value, name) => {
      headers.push({ name, value });
    });
    const normalized = normalize(headers);

    await captureServer("headers_probe", {
      domain: registrable ?? domain,
      status: final.status,
      used_method: "GET",
      final_url: final.url,
    });
    // Persist to Postgres
    const now = new Date();
    if (d) {
      await replaceHeaders({
        domainId: d.id,
        headers: normalized,
        fetchedAt: now,
        expiresAt: ttlForHeaders(now),
      });
    }
    console.info("[headers] ok", {
      domain: registrable,
      status: final.status,
      count: normalized.length,
    });
    return normalized;
  } catch (err) {
    console.warn("[headers] error", {
      domain: registrable ?? domain,
      error: (err as Error)?.message,
    });
    await captureServer("headers_probe", {
      domain: registrable ?? domain,
      status: -1,
      used_method: "ERROR",
      final_url: url,
      error: String(err),
    });
    // Return empty on failure without caching to avoid long-lived negatives
    return [];
  }
}

function normalize(h: HttpHeader[]): HttpHeader[] {
  // Normalize header names (trim + lowercase) then sort important first
  const important = new Set([
    "strict-transport-security",
    "content-security-policy",
    "content-security-policy-report-only",
    "x-frame-options",
    "referrer-policy",
    "server",
    "x-powered-by",
    "cache-control",
    "permissions-policy",
  ]);
  const normalized = h.map((hdr) => ({
    name: hdr.name.trim().toLowerCase(),
    value: hdr.value,
  }));
  return normalized.sort(
    (a, b) =>
      Number(important.has(b.name)) - Number(important.has(a.name)) ||
      a.name.localeCompare(b.name),
  );
}
