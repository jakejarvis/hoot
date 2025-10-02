import { captureServer } from "@/lib/analytics/server";
import { getOrSetZod, ns } from "@/lib/redis";
import { type HttpHeader, HttpHeadersSchema } from "@/lib/schemas";

export async function probeHeaders(domain: string): Promise<HttpHeader[]> {
  const lower = domain.toLowerCase();
  const url = `https://${domain}/`;
  const key = ns("headers", lower);

  const schema = HttpHeadersSchema;

  const REQUEST_TIMEOUT_MS = 5000;
  try {
    // Try HEAD first with timeout
    const headController = new AbortController();
    const headTimer = setTimeout(
      () => headController.abort(),
      REQUEST_TIMEOUT_MS,
    );
    let res: Response | null = null;
    try {
      res = await fetch(url, {
        method: "HEAD",
        redirect: "follow" as RequestRedirect,
        signal: headController.signal,
      });
    } finally {
      clearTimeout(headTimer);
    }

    let final: Response | null = res;
    if (!res || !res.ok) {
      const getController = new AbortController();
      const getTimer = setTimeout(
        () => getController.abort(),
        REQUEST_TIMEOUT_MS,
      );
      try {
        final = await fetch(url, {
          method: "GET",
          redirect: "follow" as RequestRedirect,
          signal: getController.signal,
        });
      } finally {
        clearTimeout(getTimer);
      }
    }

    if (!final) throw new Error("No response");

    const headers: HttpHeader[] = [];
    final.headers.forEach((value, name) => {
      headers.push({ name, value });
    });
    const normalized = normalize(headers);

    await captureServer("headers_probe", {
      domain: lower,
      status: final.status,
      used_method: res?.ok ? "HEAD" : "GET",
      final_url: final.url,
    });

    return await getOrSetZod<HttpHeader[]>(
      key,
      10 * 60,
      async () => normalized,
      schema,
    );
  } catch (err) {
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
