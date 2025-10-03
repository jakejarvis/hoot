export async function lookupIpMeta(ip: string): Promise<{
  geo: {
    city: string;
    region: string;
    country: string;
    lat: number | null;
    lon: number | null;
    emoji: string | null;
  };
  owner: string | null;
  domain: string | null;
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
      flag?: { emoji?: string };
      connection?: { org?: string; isp?: string; domain?: string };
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
    const domain = (j.connection?.domain || "").trim() || null;
    return { geo, owner, domain };
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
      domain: null,
    };
  }
}
