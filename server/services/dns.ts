import { captureServer } from "@/lib/analytics/server";
import { isCloudflareIpAsync } from "@/lib/cloudflare";
import { USER_AGENT } from "@/lib/constants";
import { ns, redis } from "@/lib/redis";
import {
  type DnsRecord,
  type DnsResolveResult,
  type DnsResolver,
  type DnsType,
  DnsTypeSchema,
} from "@/lib/schemas";

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

  // Provider-agnostic cache check: if all types are cached, return immediately
  const types = DnsTypeSchema.options;
  const cachedByType = await Promise.all(
    types.map(async (type) =>
      redis.get<DnsRecord[]>(ns("dns", `${lower}:${type}`)),
    ),
  );
  const allCached = cachedByType.every((arr) => Array.isArray(arr));
  if (allCached) {
    const flat = (cachedByType as DnsRecord[][]).flat();
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
    const resolverUsed =
      ((await redis.get(
        ns("dns:meta", `${lower}:resolver`),
      )) as DnsResolver | null) || "cloudflare";
    await captureServer("dns_result", {
      domain: lower,
      duration_ms_total: Date.now() - startedAt,
      counts,
      cloudflare_ip_present: cloudflareIpPresent,
      dns_provider_used: resolverUsed,
      provider_attempts: 0,
      duration_ms_by_provider: {},
      cache_hit: true,
    });
    console.info("[dns] cache hit", {
      domain: lower,
      counts,
      resolver: resolverUsed,
    });
    return { records: flat, resolver: resolverUsed } as DnsResolveResult;
  }

  for (let attemptIndex = 0; attemptIndex < providers.length; attemptIndex++) {
    const provider = providers[attemptIndex] as DohProvider;
    const attemptStart = Date.now();
    try {
      let usedFresh = false;
      const results = await Promise.all(
        types.map(async (type) => {
          const key = ns("dns", `${lower}:${type}`);
          const cached = await redis.get<DnsRecord[]>(key);
          if (cached) return cached;
          const fresh = await resolveTypeWithProvider(domain, type, provider);
          await redis.set(key, fresh, { ex: 5 * 60 });
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
      // Persist the resolver metadata only when we actually fetched fresh data
      if (usedFresh) {
        await redis.set(ns("dns:meta", `${lower}:resolver`), provider.key, {
          ex: 5 * 60,
        });
      }
      const resolverUsed = usedFresh
        ? provider.key
        : ((await redis.get(
            ns("dns:meta", `${lower}:resolver`),
          )) as DnsResolver | null) || provider.key;
      await captureServer("dns_result", {
        domain: lower,
        duration_ms_total: Date.now() - startedAt,
        counts,
        cloudflare_ip_present: cloudflareIpPresent,
        dns_provider_used: resolverUsed,
        provider_attempts: attemptIndex + 1,
        duration_ms_by_provider: durationByProvider,
        cache_hit: !usedFresh,
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
  await captureServer("dns_result", {
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
  const res = await fetchWithTimeout(url, {
    headers: provider.headers,
  });
  if (!res.ok) throw new Error(`DoH failed: ${provider.key} ${res.status}`);
  const json = (await res.json()) as DnsJson;
  const ans = json.Answer ?? [];
  const normalizedRecords = await Promise.all(
    ans.map((a) => normalizeAnswer(domain, type, a)),
  );
  return normalizedRecords.filter(Boolean) as DnsRecord[];
}

async function normalizeAnswer(
  _domain: string,
  type: DnsType,
  a: DnsAnswer,
): Promise<DnsRecord | undefined> {
  const name = trimDot(a.name);
  const ttl = a.TTL;
  switch (type) {
    case "A":
    case "AAAA": {
      const value = trimDot(a.data);
      const isCloudflare = await isCloudflareIpAsync(value);
      return { type, name, value, ttl, isCloudflare };
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

async function fetchWithTimeout(
  input: URL | string,
  init?: RequestInit,
  timeoutMs: number = 2000,
): Promise<Response> {
  // Up to two attempts with independent timeouts
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      lastError = err;
      clearTimeout(timer);
      if (attempt === 0) {
        // small backoff before retry
        await new Promise((r) => setTimeout(r, 150));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("fetch failed");
}
