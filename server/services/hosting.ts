import { getOrSet, ns } from "@/lib/redis";
import { resolveAll } from "./dns";
import { probeHeaders } from "./headers";

export type HostingInfo = {
  hostingProvider: string;
  emailProvider: string;
  ipAddress: string | null;
  geo: {
    city: string;
    region: string;
    country: string;
    lat: number | null;
    lon: number | null;
    emoji: string | null;
  };
};

export async function detectHosting(domain: string): Promise<HostingInfo> {
  const key = ns("hosting", domain.toLowerCase());
  return await getOrSet(key, 24 * 60 * 60, async () => {
    const dns = await resolveAll(domain);
    const a = dns.find((d) => d.type === "A");
    const mx = dns.filter((d) => d.type === "MX");
    const ip = a?.value ?? null;

    const headers = await probeHeaders(domain).catch(() => ({
      headers: [] as { name: string; value: string }[],
    }));
    const provider = detectHostingProvider(headers.headers);
    const email = detectEmailProvider(mx.map((m) => m.value));

    const geo = ip
      ? await lookupGeo(ip)
      : {
          city: "",
          region: "",
          country: "",
          lat: null,
          lon: null,
          emoji: null,
        };

    return {
      hostingProvider: provider,
      emailProvider: email,
      ipAddress: ip,
      geo,
      emoji: geo.emoji,
    };
  });
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
  if (server.includes("heroku")) return "Heroku";
  return server ? capitalize(server.split("/")[0]) : "Unknown";
}

function detectEmailProvider(mxHosts: string[]): string {
  const hosts = mxHosts.join(" ").toLowerCase();
  if (hosts.includes("google")) return "Google Workspace";
  if (hosts.includes("outlook") || hosts.includes("protection.outlook.com"))
    return "Microsoft 365";
  if (hosts.includes("zoho")) return "Zoho";
  if (hosts.includes("proton")) return "Proton";
  if (hosts.includes("messagingengine")) return "Fastmail";
  return mxHosts[0] ? mxHosts[0] : "Unknown";
}

async function lookupGeo(ip: string): Promise<{
  city: string;
  region: string;
  country: string;
  lat: number | null;
  lon: number | null;
  emoji: string | null;
}> {
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    if (!res.ok) throw new Error("geo fail");
    const j = (await res.json()) as {
      city?: string;
      region?: string;
      state?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
      flag?: {
        emoji?: string;
      };
    };
    return {
      city: j.city || "",
      region: j.region || j.state || "",
      country: j.country || "",
      lat: typeof j.latitude === "number" ? j.latitude : null,
      lon: typeof j.longitude === "number" ? j.longitude : null,
      emoji: j.flag?.emoji || null,
    };
  } catch {
    return {
      city: "",
      region: "",
      country: "",
      lat: null,
      lon: null,
      emoji: null,
    };
  }
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
