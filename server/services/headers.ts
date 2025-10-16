import { eq } from "drizzle-orm";
import { captureServer } from "@/lib/analytics/server";
import { headThenGet } from "@/lib/fetch";
import type { HttpHeader } from "@/lib/schemas";
import { db } from "@/server/db/client";
import { httpHeaders } from "@/server/db/schema";
import { ttlForHeaders } from "@/server/db/ttl";
import { upsertDomain } from "@/server/repos/domains";
import { replaceHeaders } from "@/server/repos/headers";

export async function probeHeaders(domain: string): Promise<HttpHeader[]> {
  const lower = domain.toLowerCase();
  const url = `https://${domain}/`;
  console.debug("[headers] start", { domain: lower });
  // Fast path: read from Postgres if fresh
  const d = await upsertDomain({
    name: lower,
    tld: lower.split(".").pop() as string,
    punycodeName: lower,
    unicodeName: domain,
    isIdn: /xn--/.test(lower),
  });
  const existing = await db
    .select({
      name: httpHeaders.name,
      value: httpHeaders.value,
      expiresAt: httpHeaders.expiresAt,
    })
    .from(httpHeaders)
    .where(eq(httpHeaders.domainId, d.id));
  if (existing.length > 0) {
    const now = Date.now();
    const fresh = existing.some((h) => (h.expiresAt?.getTime?.() ?? 0) > now);
    if (fresh) {
      const normalized = normalize(
        existing.map((h) => ({ name: h.name, value: h.value })),
      );
      console.info("[headers] db hit", {
        domain: lower,
        count: normalized.length,
      });
      return normalized;
    }
  }

  const REQUEST_TIMEOUT_MS = 5000;
  try {
    const { response: final, usedMethod } = await headThenGet(
      url,
      {},
      { timeoutMs: REQUEST_TIMEOUT_MS },
    );

    const headers: HttpHeader[] = [];
    final.headers.forEach((value, name) => {
      headers.push({ name, value });
    });
    const normalized = normalize(headers);

    await captureServer("headers_probe", {
      domain: lower,
      status: final.status,
      used_method: usedMethod,
      final_url: final.url,
    });
    // Persist to Postgres
    const now = new Date();
    await replaceHeaders({
      domainId: d.id,
      headers: normalized,
      fetchedAt: now,
      expiresAt: ttlForHeaders(now),
    });
    console.info("[headers] ok", {
      domain: lower,
      status: final.status,
      count: normalized.length,
    });
    return normalized;
  } catch (err) {
    console.warn("[headers] error", {
      domain: lower,
      error: (err as Error)?.message,
    });
    await captureServer("headers_probe", {
      domain: lower,
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
  // sort important first
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
  return [...h].sort(
    (a, b) =>
      Number(important.has(b.name)) - Number(important.has(a.name)) ||
      a.name.localeCompare(b.name),
  );
}
