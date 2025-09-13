import { TTLCache } from "./cache";

export type DnsRecord = {
  type: "A" | "AAAA" | "MX" | "CNAME" | "TXT" | "NS";
  name: string;
  value: string;
  ttl?: number;
  priority?: number;
};

type DnsType = DnsRecord["type"];
const TYPES: DnsType[] = ["A", "AAAA", "MX", "CNAME", "TXT", "NS"];

const cache = new TTLCache<{ domain: string; type: DnsType }, DnsRecord[]>(
  5 * 60 * 1000,
  (k) => `${k.domain}:${k.type}`,
);

export async function resolveAll(domain: string): Promise<DnsRecord[]> {
  const results: DnsRecord[] = [];
  for (const type of TYPES) {
    const cached = cache.get({ domain, type });
    if (cached) {
      results.push(...cached);
      continue;
    }
    const recs = await resolveType(domain, type).catch(() => [] as DnsRecord[]);
    cache.set({ domain, type }, recs);
    results.push(...recs);
  }
  return results;
}

async function resolveType(
  domain: string,
  type: DnsType,
): Promise<DnsRecord[]> {
  const q = new URL("https://cloudflare-dns.com/dns-query");
  q.searchParams.set("name", domain);
  q.searchParams.set("type", type);
  const res = await fetch(q, {
    headers: {
      accept: "application/dns-json",
      "user-agent": "hoot.sh/0.1",
    },
  });
  if (!res.ok) throw new Error(`DoH failed: ${res.status}`);
  const json = (await res.json()) as CloudflareDnsJson;
  const ans = json.Answer ?? [];
  return ans
    .map((a) => normalizeAnswer(domain, type, a))
    .filter(Boolean) as DnsRecord[];
}

function normalizeAnswer(
  _domain: string,
  type: DnsType,
  a: CloudflareAnswer,
): DnsRecord | undefined {
  const name = trimDot(a.name);
  const ttl = a.TTL;
  switch (type) {
    case "A":
    case "AAAA":
    case "NS":
      return { type, name, value: trimDot(a.data), ttl };
    case "TXT":
      return { type, name, value: stripTxtQuotes(a.data), ttl };
    case "CNAME":
      return { type, name, value: trimDot(a.data), ttl };
    case "MX": {
      const [prioStr, ...hostParts] = a.data.split(" ");
      const priority = Number(prioStr);
      const host = trimDot(hostParts.join(" "));
      return {
        type,
        name,
        value: host,
        ttl,
        priority: Number.isFinite(priority) ? priority : undefined,
      };
    }
  }
}

function trimDot(s: string) {
  return s.endsWith(".") ? s.slice(0, -1) : s;
}
function stripTxtQuotes(s: string) {
  // Cloudflare may return quoted strings; remove leading/trailing quotes
  return s.replace(/^"|"$/g, "");
}

type CloudflareDnsJson = {
  Status: number;
  Answer?: CloudflareAnswer[];
};
type CloudflareAnswer = {
  name: string;
  type: number;
  TTL: number;
  data: string;
};
