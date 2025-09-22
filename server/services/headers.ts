import { captureServer } from "@/lib/analytics/server";
import { getOrSet, ns } from "@/lib/redis";

export type HttpHeader = { name: string; value: string };

export async function probeHeaders(domain: string): Promise<HttpHeader[]> {
  const key = ns("headers", domain.toLowerCase());
  return await getOrSet(key, 10 * 60, async () => {
    const url = `https://${domain}/`;
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow" as RequestRedirect,
    });
    // Some origins disallow HEAD, fall back to GET
    const final = res.ok
      ? res
      : await fetch(url, {
          method: "GET",
          redirect: "follow" as RequestRedirect,
        });
    const headers: HttpHeader[] = [];
    final.headers.forEach((value, name) => {
      headers.push({ name, value });
    });
    await captureServer("headers_probe", {
      domain,
      status: final.status,
      used_method: res.ok ? "HEAD" : "GET",
      final_url: final.url,
    });
    return normalize(headers);
  });
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
