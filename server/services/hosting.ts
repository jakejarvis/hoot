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
    // Determine email provider, using "none" when MX is unset
    const emailName =
      mx.length === 0
        ? "none"
        : detectEmailProviderFromMx(mx.map((m) => m.value));

    const meta = ip
      ? await lookupIpMeta(ip)
      : {
          geo: {
            city: "",
            region: "",
            country: "",
            lat: null,
            lon: null,
            emoji: null,
          },
          owner: null,
        };
    const geo = meta.geo;

    // Hosting provider detection with fallback:
    // - If no A record/IP → unset → "none"
    // - Else if unknown → try IP ownership org/ISP
    let hostingName = detectHostingProviderFromHeaders(headers.headers);
    if (!ip) {
      hostingName = "none";
    } else if (/^unknown$/i.test(hostingName)) {
      if (meta.owner) hostingName = meta.owner;
    }

    const hostingIconDomain = mapProviderNameToDomain(hostingName) || null;
    const emailIconDomain = mapProviderNameToDomain(emailName) || null;

    return {
      hostingProvider: { name: hostingName, iconDomain: hostingIconDomain },
      emailProvider: { name: emailName, iconDomain: emailIconDomain },
      ipAddress: ip,
      geo,
    };
  });
}

async function lookupIpMeta(ip: string): Promise<{
  geo: {
    city: string;
    region: string;
    country: string;
    lat: number | null;
    lon: number | null;
    emoji: string | null;
  };
  owner: string | null;
}> {
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    if (!res.ok) throw new Error("ipwho fail");
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
      connection?: { org?: string; isp?: string };
    };
    const geo = {
      city: j.city || "",
      region: j.region || j.state || "",
      country: j.country || "",
      lat: typeof j.latitude === "number" ? j.latitude : null,
      lon: typeof j.longitude === "number" ? j.longitude : null,
      emoji: j.flag?.emoji || null,
    };
    const org = j.connection?.org?.trim();
    const isp = j.connection?.isp?.trim();
    const owner = (org || isp || "").trim() || null;
    return { geo, owner };
  } catch {
    return {
      geo: {
        city: "",
        region: "",
        country: "",
        lat: null,
        lon: null,
        emoji: null,
      },
      owner: null,
    };
  }
}
