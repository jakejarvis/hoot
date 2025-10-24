import { eq } from "drizzle-orm";
import { getDomainTld } from "rdapper";
import { db } from "@/lib/db/client";
import { upsertDomain } from "@/lib/db/repos/domains";
import { replaceHeaders } from "@/lib/db/repos/headers";
import { httpHeaders } from "@/lib/db/schema";
import { ttlForHeaders } from "@/lib/db/ttl";
import { toRegistrableDomain } from "@/lib/domain-server";
import { fetchWithTimeout } from "@/lib/fetch";
import { logger } from "@/lib/logger";
import { scheduleSectionIfEarlier } from "@/lib/schedule";
import type { HttpHeader } from "@/lib/schemas";

const log = logger({ module: "headers" });

export async function probeHeaders(domain: string): Promise<HttpHeader[]> {
  const url = `https://${domain}/`;
  log.debug("start", { domain });
  // Fast path: read from Postgres if fresh
  const registrable = toRegistrableDomain(domain);
  const d = registrable
    ? await upsertDomain({
        name: registrable,
        tld: getDomainTld(registrable) ?? "",
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
      log.info("cache.hit", {
        domain: registrable ?? domain,
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

    // Persist to Postgres
    const now = new Date();
    if (d) {
      await replaceHeaders({
        domainId: d.id,
        headers: normalized,
        fetchedAt: now,
        expiresAt: ttlForHeaders(now),
      });
      try {
        const dueAtMs = ttlForHeaders(now).getTime();
        await scheduleSectionIfEarlier(
          "headers",
          registrable ?? domain,
          dueAtMs,
        );
      } catch {}
    }
    log.info("ok", {
      domain: registrable ?? domain,
      status: final.status,
      count: normalized.length,
    });
    return normalized;
  } catch (err) {
    log.error("error", {
      domain: registrable ?? domain,
      err,
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
