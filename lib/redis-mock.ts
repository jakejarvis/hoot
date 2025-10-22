// Lightweight in-memory Redis adapter for tests. Matches the subset of
// @upstash/redis API used in the codebase.

type SetOptions = {
  ex?: number; // seconds
  nx?: boolean; // only set if not exists
};

type ZAddEntry = { score: number; member: string };

type ExpiryEntry = {
  value: unknown;
  // Expiration timestamp in ms; undefined means no expiry
  expiresAtMs?: number;
};

function nowMs(): number {
  return Date.now();
}

function isExpired(entry: ExpiryEntry | undefined): boolean {
  return !!entry?.expiresAtMs && entry.expiresAtMs <= nowMs();
}

let activeReset: (() => void) | null = null;

export function resetInMemoryRedis(): void {
  activeReset?.();
}

export function makeInMemoryRedis() {
  const kv = new Map<string, ExpiryEntry>();
  const zsets = new Map<string, Map<string, number>>();
  const hashes = new Map<string, Map<string, string>>();

  function getZset(key: string): Map<string, number> {
    let set = zsets.get(key);
    if (!set) {
      set = new Map<string, number>();
      zsets.set(key, set);
    }
    return set;
  }

  function getHash(key: string): Map<string, string> {
    let hash = hashes.get(key);
    if (!hash) {
      hash = new Map<string, string>();
      hashes.set(key, hash);
    }
    return hash;
  }

  async function get<T = unknown>(key: string): Promise<T | null> {
    const entry = kv.get(key);
    if (!entry) return null;
    if (isExpired(entry)) {
      kv.delete(key);
      return null;
    }
    return (entry.value as T) ?? null;
  }

  async function set(
    key: string,
    value: unknown,
    options?: SetOptions,
  ): Promise<"OK" | undefined> {
    const existing = kv.get(key);
    if (options?.nx) {
      if (existing && !isExpired(existing)) return undefined;
    }

    const expiresAtMs =
      typeof options?.ex === "number" && options.ex > 0
        ? nowMs() + options.ex * 1000
        : undefined;

    kv.set(key, { value, expiresAtMs });
    return "OK" as const;
  }

  async function del(key: string): Promise<number> {
    const exists = kv.get(key);
    const removed = kv.delete(key) ? 1 : 0;
    // also cleanup related zset member if this key represents a member —
    // no-op here; members are tracked per-zset.
    if (exists && removed) return 1;
    return 0;
  }

  async function exists(key: string): Promise<number> {
    const entry = kv.get(key);
    if (!entry) return 0;
    if (isExpired(entry)) {
      kv.delete(key);
      return 0;
    }
    return 1;
  }

  async function incr(key: string): Promise<number> {
    const raw = await get<string | number | null>(key);
    const current = Number(raw ?? 0);
    const next = current + 1;
    await set(key, String(next));
    return next;
  }

  async function expire(key: string, seconds: number): Promise<number> {
    const entry = kv.get(key);
    if (!entry || isExpired(entry)) return 0;
    entry.expiresAtMs = nowMs() + Math.max(0, seconds) * 1000;
    kv.set(key, entry);
    return 1;
  }

  async function ttl(key: string): Promise<number> {
    const entry = kv.get(key);
    if (!entry) return -2; // key does not exist
    if (!entry.expiresAtMs) return -1; // no expiry
    const remainingMs = entry.expiresAtMs - nowMs();
    if (remainingMs <= 0) return -2;
    return Math.ceil(remainingMs / 1000);
  }

  async function zadd(
    key: string,
    entry: ZAddEntry | ZAddEntry[],
  ): Promise<number> {
    const z = getZset(key);
    const list = Array.isArray(entry) ? entry : [entry];
    for (const e of list) z.set(e.member, e.score);
    return list.length;
  }

  async function zrange(
    key: string,
    min: number,
    max: number,
    options?: { byScore?: boolean; offset?: number; count?: number },
  ): Promise<string[]> {
    const z = getZset(key);
    const items = Array.from(z.entries())
      .filter(([, score]) => score >= min && score <= max)
      .sort((a, b) => a[1] - b[1])
      .map(([member]) => member);
    const offset = options?.offset ?? 0;
    const count = options?.count ?? items.length;
    return items.slice(offset, offset + count);
  }

  async function zrem(key: string, ...members: string[]): Promise<number> {
    const z = getZset(key);
    let removed = 0;
    for (const m of members) {
      if (z.delete(m)) removed++;
    }
    return removed;
  }

  async function zscore(key: string, member: string): Promise<number | null> {
    const z = getZset(key);
    const score = z.get(member);
    return score !== undefined ? score : null;
  }

  async function hget(key: string, field: string): Promise<string | null> {
    const h = getHash(key);
    return h.get(field) ?? null;
  }

  async function hset(
    key: string,
    fieldValues: Record<string, string | number>,
  ): Promise<number> {
    const h = getHash(key);
    let added = 0;
    for (const [field, value] of Object.entries(fieldValues)) {
      const existed = h.has(field);
      h.set(field, String(value));
      if (!existed) added++;
    }
    return added;
  }

  async function hincrby(
    key: string,
    field: string,
    increment: number,
  ): Promise<number> {
    const h = getHash(key);
    const current = Number(h.get(field) ?? 0);
    const next = current + increment;
    h.set(field, String(next));
    return next;
  }

  async function hdel(key: string, ...fields: string[]): Promise<number> {
    const h = getHash(key);
    let removed = 0;
    for (const f of fields) {
      if (h.delete(f)) removed++;
    }
    return removed;
  }

  const ns = (...parts: string[]) => parts.join(":");

  // Register the most recently created instance as the active one
  activeReset = () => {
    kv.clear();
    for (const m of zsets.values()) m.clear();
    for (const m of hashes.values()) m.clear();
  };

  return {
    ns,
    redis: {
      get,
      set,
      del,
      exists,
      incr,
      expire,
      ttl,
      zadd,
      zrange,
      zrem,
      zscore,
      hget,
      hset,
      hincrby,
      hdel,
    },
    reset: resetInMemoryRedis,
  } as const;
}

export type InMemoryRedis = ReturnType<typeof makeInMemoryRedis>;
