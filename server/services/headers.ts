import { TTLCache } from "./cache";

export type HttpHeader = { name: string; value: string };

const cache = new TTLCache<
  string,
  { url: string; status: number; headers: HttpHeader[] }
>(10 * 60 * 1000, (k) => k);

export async function probeHeaders(domain: string) {
  const key = domain.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

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
  const out = {
    url: final.url,
    status: final.status,
    headers: normalize(headers),
  };
  cache.set(key, out);
  return out;
}

function normalize(h: HttpHeader[]): HttpHeader[] {
  // sort important first
  const important = new Set([
    "strict-transport-security",
    "content-security-policy",
    "x-frame-options",
    "referrer-policy",
    "server",
    "cache-control",
  ]);
  return [...h].sort(
    (a, b) =>
      Number(important.has(b.name)) - Number(important.has(a.name)) ||
      a.name.localeCompare(b.name),
  );
}
