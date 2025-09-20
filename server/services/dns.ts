import { getOrSet, ns } from "@/lib/redis";
import { isCloudflareIpAsync } from "./cloudflare";

export type DnsRecord = {
  type: "A" | "AAAA" | "MX" | "TXT" | "NS";
  name: string;
  value: string;
  ttl?: number;
  priority?: number;
  isCloudflare?: boolean;
};

type DnsType = DnsRecord["type"];
const TYPES: DnsType[] = ["A", "AAAA", "MX", "TXT", "NS"];

export async function resolveAll(domain: string): Promise<DnsRecord[]> {
  const lower = domain.toLowerCase();
  const promises = TYPES.map(async (type) => {
    const key = ns("dns", `${lower}:${type}`);
    return await getOrSet<DnsRecord[]>(
      key,
      5 * 60,
      async () =>
        await resolveType(domain, type).catch(() => [] as DnsRecord[]),
    );
  });
  const results = await Promise.all(promises);
  return results.flat();
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
      "user-agent": "hoot.sh/0.1 (+https://hoot.sh)",
    },
  });
  if (!res.ok) throw new Error(`DoH failed: ${res.status}`);
  const json = (await res.json()) as CloudflareDnsJson;
  const ans = json.Answer ?? [];
  const normalizedRecords = await Promise.all(
    ans.map((a) => normalizeAnswer(domain, type, a)),
  );
  return normalizedRecords.filter(Boolean) as DnsRecord[];
}

async function normalizeAnswer(
  _domain: string,
  type: DnsType,
  a: CloudflareAnswer,
): Promise<DnsRecord | undefined> {
  const name = trimDot(a.name);
  const ttl = a.TTL;
  switch (type) {
    case "A":
    case "AAAA":
    case "NS": {
      const value = trimDot(a.data);
      const isCloudflare =
        type === "A" || type === "AAAA"
          ? await isCloudflareIpAsync(value)
          : false;
      return { type, name, value, ttl, isCloudflare };
    }
    case "TXT":
      return { type, name, value: stripTxtQuotes(a.data), ttl };
    case "MX": {
      const [prioStr, ...hostParts] = a.data.split(" ");
      const priority = Number(prioStr);
      const host = trimDot(hostParts.join(" "));
      return {
        type,
        name,
        value: host,
        ttl,
        priority: Number.isFinite(priority) ? priority : 0,
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
