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
  const startedAt = Date.now();
  console.debug("[ip] start", { ip });
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    if (!res.ok) throw new Error("ipwho.is fail");

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

    console.debug("[ip] ipwho.is result", { ip, json: j });

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

    console.info("[ip] ok", {
      ip,
      owner: owner || undefined,
      domain: domain || undefined,
      country: geo.country,
      duration_ms: Date.now() - startedAt,
    });
    return { geo, owner, domain };
  } catch {
    console.warn("[ip] error", { ip });
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
