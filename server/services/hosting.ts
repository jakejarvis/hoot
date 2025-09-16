import {
  detectEmailProviderFromMx,
  detectHostingProviderFromHeaders,
  mapProviderNameToDomain,
} from "@/lib/providers";
import { getOrSet, ns } from "@/lib/redis";
import { resolveAll } from "./dns";
import { probeHeaders } from "./headers";

export type ProviderRef = { name: string; iconDomain: string | null };

export type HostingInfo = {
  hostingProvider: ProviderRef;
  emailProvider: ProviderRef;
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
    const provider = detectHostingProviderFromHeaders(headers.headers);
    const email = detectEmailProviderFromMx(mx.map((m) => m.value));
    const hostingIconDomain = mapProviderNameToDomain(provider) || null;
    const emailIconDomain = mapProviderNameToDomain(email) || null;

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
      hostingProvider: { name: provider, iconDomain: hostingIconDomain },
      emailProvider: { name: email, iconDomain: emailIconDomain },
      ipAddress: ip,
      geo,
    };
  });
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
