import { logger } from "@/lib/logger";

const log = logger();

export async function lookupIpMeta(ip: string): Promise<{
  geo: {
    city: string;
    region: string;
    country: string;
    country_code: string;
    lat: number | null;
    lon: number | null;
  };
  owner: string | null;
  domain: string | null;
}> {
  log.debug("ip.start", { ip });
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    if (!res.ok) throw new Error("ipwho.is fail");

    // https://ipwhois.io/documentation
    // https://chatgpt.com/s/t_68ed0de1e01881919c2545fe40ffc7ac
    const j = (await res.json()) as {
      ip?: string;
      success?: boolean;
      type?: "IPv4" | "IPv6";
      continent?: string;
      continent_code?: string;
      country?: string;
      country_code?: string;
      region?: string;
      region_code?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      is_eu?: boolean;
      postal?: string;
      calling_code?: string;
      capital?: string;
      borders?: string; // e.g., "CA,MX"
      flag?: {
        img?: string; // URL to SVG/PNG
        emoji?: string; // e.g., "🇺🇸"
        emoji_unicode?: string; // e.g., "U+1F1FA U+1F1F8"
      };
      connection: {
        asn?: number;
        org?: string;
        isp?: string;
        domain?: string;
      };
      timezone?: {
        id?: string; // IANA TZ, e.g., "America/New_York"
        abbr?: string; // e.g., "EDT"
        is_dst?: boolean;
        offset?: number; // seconds offset from UTC (can be negative)
        utc?: string; // e.g., "-04:00"
        current_time?: string; // ISO8601 with offset
      };
    };

    log.debug("ip.ipwho.is.result", { ip, json: j });

    const org = j.connection?.org?.trim();
    const isp = j.connection?.isp?.trim();
    const owner = (org || isp || "").trim() || null;
    const domain = (j.connection?.domain || "").trim() || null;
    const geo = {
      city: j.city || "",
      region: j.region || "",
      country: j.country || "",
      country_code: j.country_code || "",
      lat: typeof j.latitude === "number" ? j.latitude : null,
      lon: typeof j.longitude === "number" ? j.longitude : null,
    };

    log.info("ip.ok", {
      ip,
      owner: owner || undefined,
      domain: domain || undefined,
      geo: geo || undefined,
    });
    return { geo, owner, domain };
  } catch {
    log.warn("ip.error", { ip });
    return {
      owner: null,
      domain: null,
      geo: {
        city: "",
        region: "",
        country: "",
        country_code: "",
        lat: null,
        lon: null,
      },
    };
  }
}
