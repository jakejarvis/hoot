import { TTLCache } from "./cache";
import { resolveAll } from "./dns";
import { probeHeaders } from "./headers";

export type HostingInfo = {
  hostingProvider: string;
  emailProvider: string;
  ipAddress: string | null;
  geo: { city: string; region: string; country: string };
};

const cache = new TTLCache<string, HostingInfo>(24 * 60 * 60 * 1000, (k) =>
  k.toLowerCase(),
);

export async function detectHosting(domain: string): Promise<HostingInfo> {
  const key = domain.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const dns = await resolveAll(domain);
  const a = dns.find((d) => d.type === "A");
  const mx = dns.filter((d) => d.type === "MX");
  const ip = a?.value ?? null;

  const headers = await probeHeaders(domain).catch(() => ({
    headers: [] as { name: string; value: string }[],
  }));
  const provider = detectHostingProvider(headers.headers);
  const email = detectEmailProvider(mx.map((m) => m.value));

  const geo = ip ? await lookupGeo(ip) : { city: "", region: "", country: "" };

  const out: HostingInfo = {
    hostingProvider: provider,
    emailProvider: email,
    ipAddress: ip,
    geo,
  };
  cache.set(key, out);
  return out;
}

function detectHostingProvider(
  headers: { name: string; value: string }[],
): string {
  const byName = Object.fromEntries(
    headers.map((h) => [h.name.toLowerCase(), h.value]),
  ) as Record<string, string>;
  const server = (byName.server || "").toLowerCase();
  const headerNames = headers.map((h) => h.name.toLowerCase());
  if (
    server.includes("vercel") ||
    headerNames.some((n) => n.startsWith("x-vercel"))
  )
    return "Vercel";
  if (server.includes("cloudflare") || byName["cf-ray"]) return "Cloudflare";
  if (server.includes("netlify")) return "Netlify";
  if (server.includes("github")) return "GitHub Pages";
  if (server.includes("fly.io")) return "Fly.io";
  if (server.includes("akamai")) return "Akamai";
  return server ? capitalize(server.split("/")[0]) : "Unknown";
}

function detectEmailProvider(mxHosts: string[]): string {
  const hosts = mxHosts.join(" ").toLowerCase();
  if (hosts.includes("google")) return "Google Workspace";
  if (hosts.includes("outlook") || hosts.includes("protection.outlook.com"))
    return "Microsoft 365";
  if (hosts.includes("fastmail")) return "Fastmail";
  if (hosts.includes("zoho")) return "Zoho";
  if (hosts.includes("proton")) return "Proton";
  return mxHosts[0] ? mxHosts[0] : "Unknown";
}

async function lookupGeo(
  ip: string,
): Promise<{ city: string; region: string; country: string }> {
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    if (!res.ok) throw new Error("geo fail");
    const j = (await res.json()) as {
      city?: string;
      region?: string;
      state?: string;
      country?: string;
    };
    return {
      city: j.city || "",
      region: j.region || j.state || "",
      country: j.country || "",
    };
  } catch {
    return { city: "", region: "", country: "" };
  }
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
