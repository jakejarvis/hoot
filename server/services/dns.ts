import { eq } from "drizzle-orm";
import { captureServer } from "@/lib/analytics/server";
import { isCloudflareIpAsync } from "@/lib/cloudflare";
import { USER_AGENT } from "@/lib/constants";
import { fetchWithTimeout } from "@/lib/fetch";
import {
  type DnsRecord,
  type DnsResolveResult,
  type DnsResolver,
  type DnsType,
  DnsTypeSchema,
} from "@/lib/schemas";
import { db } from "@/server/db/client";
import { dnsRecords } from "@/server/db/schema";
import { ttlForDnsRecord } from "@/server/db/ttl";
import { replaceDns } from "@/server/repos/dns";
import { upsertDomain } from "@/server/repos/domains";

export type DohProvider = {
  key: DnsResolver;
  buildUrl: (domain: string, type: DnsType) => URL;
  headers?: Record<string, string>;
};

const DEFAULT_HEADERS: Record<string, string> = {
  accept: "application/dns-json",
  "user-agent": USER_AGENT,
};

export const DOH_PROVIDERS: DohProvider[] = [
  {
    key: "cloudflare",
    buildUrl: (domain, type) => {
      const u = new URL("https://cloudflare-dns.com/dns-query");
      u.searchParams.set("name", domain);
      u.searchParams.set("type", type);
      return u;
    },
    headers: DEFAULT_HEADERS,
  },
  {
    key: "google",
    buildUrl: (domain, type) => {
      const u = new URL("https://dns.google/resolve");
      u.searchParams.set("name", domain);
      u.searchParams.set("type", type);
      return u;
    },
    headers: DEFAULT_HEADERS,
  },
];

export async function resolveAll(domain: string): Promise<DnsResolveResult> {
  const lower = domain.toLowerCase();
  const startedAt = Date.now();
  console.debug("[dns] start", { domain: lower });
  const providers = providerOrderForLookup(lower);
  const durationByProvider: Record<string, number> = {};
  let lastError: unknown = null;
  const types = DnsTypeSchema.options;

  // Read from Postgres first; return if fresh
  const d = await upsertDomain({
    name: lower,
    tld: lower.split(".").pop() as string,
    punycodeName: lower,
    unicodeName: domain,
    isIdn: /xn--/.test(lower),
  });
  const rows = await db
    .select({
      type: dnsRecords.type,
      name: dnsRecords.name,
      value: dnsRecords.value,
      ttl: dnsRecords.ttl,
      priority: dnsRecords.priority,
      isCloudflare: dnsRecords.isCloudflare,
      resolver: dnsRecords.resolver,
      expiresAt: dnsRecords.expiresAt,
    })
    .from(dnsRecords)
    .where(eq(dnsRecords.domainId, d.id));
  if (rows.length > 0) {
    const now = Date.now();
    const fresh = rows.some((r) => (r.expiresAt?.getTime?.() ?? 0) > now);
    const assembled: DnsRecord[] = rows.map((r) => ({
      type: r.type as DnsType,
      name: r.name,
      value: r.value,
      ttl: r.ttl ?? undefined,
      priority: r.priority ?? undefined,
      isCloudflare: r.isCloudflare ?? undefined,
    }));
    const resolver = (rows[0]?.resolver ?? "cloudflare") as DnsResolver;
    const sorted = sortDnsRecordsByType(assembled, types);
    if (fresh) {
      await captureServer("dns_resolve_all", {
        domain: lower,
        duration_ms_total: Date.now() - startedAt,
        counts: ((): Record<DnsType, number> => {
          return (types as DnsType[]).reduce(
            (acc, t) => {
              acc[t] = sorted.filter((r) => r.type === t).length;
              return acc;
            },
            { A: 0, AAAA: 0, MX: 0, TXT: 0, NS: 0 } as Record<DnsType, number>,
          );
        })(),
        cloudflare_ip_present: sorted.some(
          (r) => (r.type === "A" || r.type === "AAAA") && r.isCloudflare,
        ),
        dns_provider_used: resolver,
        provider_attempts: 0,
        duration_ms_by_provider: {},
        cache_hit: true,
        cache_source: "postgres",
      });
      return { records: sorted, resolver };
    }
  }

  for (let attemptIndex = 0; attemptIndex < providers.length; attemptIndex++) {
    const provider = providers[attemptIndex] as DohProvider;
    const attemptStart = Date.now();
    try {
      let usedFresh = false;
      const results = await Promise.all(
        types.map(async (type) => {
          const fresh = await resolveTypeWithProvider(domain, type, provider);
          usedFresh = usedFresh || true;
          return fresh;
        }),
      );
      const flat = results.flat();
      durationByProvider[provider.key] = Date.now() - attemptStart;

      const counts = types.reduce(
        (acc, t) => {
          acc[t] = flat.filter((r) => r.type === t).length;
          return acc;
        },
        { A: 0, AAAA: 0, MX: 0, TXT: 0, NS: 0 } as Record<DnsType, number>,
      );
      const cloudflareIpPresent = flat.some(
        (r) => (r.type === "A" || r.type === "AAAA") && r.isCloudflare,
      );
      const resolverUsed = provider.key;

      // Persist to Postgres
      const now = new Date();
      const recordsByType: Record<DnsType, DnsRecord[]> = {
        A: [],
        AAAA: [],
        MX: [],
        TXT: [],
        NS: [],
      };
      for (const r of flat) recordsByType[r.type].push(r);
      await replaceDns({
        domainId: d.id,
        resolver: resolverUsed,
        fetchedAt: now,
        recordsByType: Object.fromEntries(
          (Object.keys(recordsByType) as DnsType[]).map((t) => [
            t,
            (recordsByType[t] as DnsRecord[]).map((r) => ({
              name: r.name,
              value: r.value,
              ttl: r.ttl ?? null,
              priority: r.priority ?? null,
              isCloudflare: r.isCloudflare ?? null,
              expiresAt: ttlForDnsRecord(now, r.ttl ?? null),
            })),
          ]),
        ) as Record<
          DnsType,
          Array<{
            name: string;
            value: string;
            ttl: number | null;
            priority: number | null;
            isCloudflare: boolean | null;
            expiresAt: Date;
          }>
        >,
      });
      await captureServer("dns_resolve_all", {
        domain: lower,
        duration_ms_total: Date.now() - startedAt,
        counts,
        cloudflare_ip_present: cloudflareIpPresent,
        dns_provider_used: resolverUsed,
        provider_attempts: attemptIndex + 1,
        duration_ms_by_provider: durationByProvider,
        cache_hit: false,
        cache_source: "fresh",
      });
      console.info("[dns] ok", {
        domain: lower,
        counts,
        resolver: resolverUsed,
        duration_ms_total: Date.now() - startedAt,
      });
      return { records: flat, resolver: resolverUsed } as DnsResolveResult;
    } catch (err) {
      console.warn("[dns] provider attempt failed", {
        domain: lower,
        provider: provider.key,
        error: (err as Error)?.message,
      });
      durationByProvider[provider.key] = Date.now() - attemptStart;
      lastError = err;
      // Try next provider in rotation
    }
  }

  // All providers failed
  await captureServer("dns_resolve_all", {
    domain: lower,
    duration_ms_total: Date.now() - startedAt,
    failure: true,
    provider_attempts: providers.length,
  });
  console.error("[dns] all providers failed", {
    domain: lower,
    providers: providers.map((p) => p.key),
    error: String(lastError),
  });
  throw new Error(
    `All DoH providers failed for ${lower}: ${String(lastError)}`,
  );
}

async function resolveTypeWithProvider(
  domain: string,
  type: DnsType,
  provider: DohProvider,
): Promise<DnsRecord[]> {
  const url = provider.buildUrl(domain, type);
  const res = await fetchWithTimeout(
    url,
    {
      headers: provider.headers,
    },
    { timeoutMs: 2000, retries: 1, backoffMs: 150 },
  );
  if (!res.ok) throw new Error(`DoH failed: ${provider.key} ${res.status}`);
  const json = (await res.json()) as DnsJson;
  const ans = json.Answer ?? [];
  const normalizedRecords = await Promise.all(
    ans.map((a) => normalizeAnswer(domain, type, a)),
  );
  const records = normalizedRecords.filter(Boolean) as DnsRecord[];
  return sortDnsRecordsForType(records, type);
}

function normalizeAnswer(
  _domain: string,
  type: DnsType,
  a: DnsAnswer,
): Promise<DnsRecord | undefined> | DnsRecord | undefined {
  const name = trimDot(a.name);
  const ttl = a.TTL;
  switch (type) {
    case "A":
    case "AAAA": {
      const value = trimDot(a.data);
      const isCloudflarePromise = isCloudflareIpAsync(value);
      return isCloudflarePromise.then((isCloudflare) => ({
        type,
        name,
        value,
        ttl,
        isCloudflare,
      }));
    }
    case "NS": {
      return { type, name, value: trimDot(a.data), ttl };
    }
    case "TXT":
      return { type, name, value: trimQuotes(a.data), ttl };
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
function trimQuotes(s: string) {
  // Cloudflare may return quoted strings; remove leading/trailing quotes
  return s.replace(/^"|"$/g, "");
}

function sortDnsRecordsByType(
  records: DnsRecord[],
  order: readonly DnsType[],
): DnsRecord[] {
  const byType: Record<DnsType, DnsRecord[]> = {
    A: [],
    AAAA: [],
    MX: [],
    TXT: [],
    NS: [],
  };
  for (const r of records) byType[r.type].push(r);
  const sorted: DnsRecord[] = [];
  for (const t of order) {
    sorted.push(...sortDnsRecordsForType(byType[t] as DnsRecord[], t));
  }
  return sorted;
}

function sortDnsRecordsForType(arr: DnsRecord[], type: DnsType): DnsRecord[] {
  if (type === "MX") {
    arr.sort((a, b) => {
      const ap = (a.priority ?? Number.MAX_SAFE_INTEGER) as number;
      const bp = (b.priority ?? Number.MAX_SAFE_INTEGER) as number;
      if (ap !== bp) return ap - bp;
      return a.value.localeCompare(b.value);
    });
    return arr;
  }
  if (type === "TXT" || type === "NS") {
    arr.sort((a, b) => a.value.localeCompare(b.value));
    return arr;
  }
  // For A/AAAA retain provider order
  return arr;
}

type DnsJson = {
  Status: number;
  Answer?: DnsAnswer[];
};
type DnsAnswer = {
  name: string;
  type: number;
  TTL: number;
  data: string;
};

function providerOrderForLookup(_domain: string): DohProvider[] {
  // Randomize order to distribute load; could be replaced with hash-based rotation
  const providers = DOH_PROVIDERS.slice();
  for (let i = providers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = providers[i] as DohProvider;
    providers[i] = providers[j] as DohProvider;
    providers[j] = tmp;
  }
  return providers;
}
