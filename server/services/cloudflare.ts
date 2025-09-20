import * as ipaddr from "ipaddr.js";
import { unstable_cache } from "next/cache";

export interface CloudflareIpRanges {
  ipv4Cidrs: string[];
  ipv6Cidrs: string[];
}

let lastLoadedIpv6Parsed: Array<[ipaddr.IPv6, number]> | undefined;
let lastLoadedIpv4Parsed: Array<[ipaddr.IPv4, number]> | undefined;

export const getCloudflareIpRanges = unstable_cache(
  async (): Promise<CloudflareIpRanges> => {
    const res = await fetch("https://api.cloudflare.com/client/v4/ips");
    if (!res.ok) {
      throw new Error(`Failed to fetch Cloudflare IPs: ${res.status}`);
    }
    const data = await res.json();
    const ranges: CloudflareIpRanges = {
      ipv4Cidrs: data.result?.ipv4_cidrs || [],
      ipv6Cidrs: data.result?.ipv6_cidrs || [],
    };
    // Pre-parse IPv6 CIDRs for fast sync/async checks
    try {
      lastLoadedIpv6Parsed = ranges.ipv6Cidrs
        .map((cidr) => {
          try {
            const [net, prefix] = ipaddr.parseCIDR(cidr);
            if (net.kind() !== "ipv6") return undefined;
            return [net as ipaddr.IPv6, prefix] as [ipaddr.IPv6, number];
          } catch {
            return undefined;
          }
        })
        .filter(Boolean) as Array<[ipaddr.IPv6, number]>;
    } catch {
      lastLoadedIpv6Parsed = undefined;
    }
    // Pre-parse IPv4 CIDRs for fast sync/async checks
    try {
      lastLoadedIpv4Parsed = ranges.ipv4Cidrs
        .map((cidr) => {
          try {
            const [net, prefix] = ipaddr.parseCIDR(cidr);
            if (net.kind() !== "ipv4") return undefined;
            return [net as ipaddr.IPv4, prefix] as [ipaddr.IPv4, number];
          } catch {
            return undefined;
          }
        })
        .filter(Boolean) as Array<[ipaddr.IPv4, number]>;
    } catch {
      lastLoadedIpv4Parsed = undefined;
    }
    return ranges;
  },
  ["cloudflare-ip-ranges"],
  // Cache for a very long time (30 days)
  { revalidate: 30 * 24 * 60 * 60 },
);

export function isCloudflareIp(ip: string): boolean {
  if (ipaddr.IPv4.isValid(ip)) {
    if (!lastLoadedIpv4Parsed) return false;
    const v4 = ipaddr.IPv4.parse(ip);
    return lastLoadedIpv4Parsed.some((range) => v4.match(range));
  }

  if (ipaddr.IPv6.isValid(ip)) {
    if (!lastLoadedIpv6Parsed) return false;
    const v6 = ipaddr.IPv6.parse(ip);
    return lastLoadedIpv6Parsed.some((range) => v6.match(range));
  }

  return false;
}

export async function isCloudflareIpAsync(ip: string): Promise<boolean> {
  const ranges = await getCloudflareIpRanges();

  if (ipaddr.IPv4.isValid(ip)) {
    const v4 = ipaddr.IPv4.parse(ip);
    if (lastLoadedIpv4Parsed && lastLoadedIpv4Parsed.length > 0) {
      return lastLoadedIpv4Parsed.some((range) => v4.match(range));
    }
    return ranges.ipv4Cidrs.some((cidr) => ipV4InCidr(v4, cidr));
  }

  if (ipaddr.IPv6.isValid(ip)) {
    const v6 = ipaddr.IPv6.parse(ip);
    // Prefer pre-parsed ranges if present
    if (lastLoadedIpv6Parsed && lastLoadedIpv6Parsed.length > 0) {
      return lastLoadedIpv6Parsed.some((range) => v6.match(range));
    }
    // Fallback to parsing on the fly
    return ranges.ipv6Cidrs.some((cidr) => ipV6InCidr(v6, cidr));
  }

  return false;
}

function ipV4InCidr(addr: ipaddr.IPv4, cidr: string): boolean {
  try {
    const [net, prefix] = ipaddr.parseCIDR(cidr);
    if (net.kind() !== "ipv4") return false;
    return addr.match([net as ipaddr.IPv4, prefix]);
  } catch {
    return false;
  }
}

function ipV6InCidr(addr: ipaddr.IPv6, cidr: string): boolean {
  try {
    const [net, prefix] = ipaddr.parseCIDR(cidr);
    if (net.kind() !== "ipv6") return false;
    return addr.match([net as ipaddr.IPv6, prefix]);
  } catch {
    return false;
  }
}
