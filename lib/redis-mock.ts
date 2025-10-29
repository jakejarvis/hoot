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

  async function setex(
    key: string,
    seconds: number,
    value: unknown,
  ): Promise<"OK"> {
    await set(key, value, { ex: seconds });
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
    const sortedEntries = Array.from(z.entries()).sort((a, b) => a[1] - b[1]);

    let items: string[];
    if (options?.byScore) {
      // Score-based range: filter by score values
      items = sortedEntries
        .filter(([, score]) => score >= min && score <= max)
        .map(([member]) => member);
      const offset = options.offset ?? 0;
      const count = options.count ?? items.length;
      return items.slice(offset, offset + count);
    } else {
      // Index-based range: slice by index positions
      items = sortedEntries.map(([member]) => member);
      const start = min < 0 ? items.length + min : min;
      const end = max < 0 ? items.length + max + 1 : max + 1;
      return items.slice(start, end);
    }
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
    const h = hashes.get(key);
    return h?.get(field) ?? null;
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
    // Validate increment is an integer
    if (!Number.isInteger(increment)) {
      throw new Error("ERR increment is not an integer");
    }

    const h = getHash(key);
    const existingValue = h.get(field);

    // Validate existing field value is an integer string if present
    if (existingValue !== undefined) {
      if (!/^-?\d+$/.test(existingValue)) {
        throw new Error("ERR hash value is not an integer");
      }
    }

    const current = existingValue !== undefined ? Number(existingValue) : 0;
    const next = current + increment;
    h.set(field, String(next));
    return next;
  }

  async function hdel(key: string, ...fields: string[]): Promise<number> {
    const h = hashes.get(key);
    let removed = 0;
    if (h) {
      for (const f of fields) {
        if (h.delete(f)) removed++;
      }
      // Optionally drop empty hash to mirror real-world memory behavior:
      if (h.size === 0) hashes.delete(key);
    }
    return removed;
  }

  async function hgetall(key: string): Promise<Record<string, string>> {
    const h = hashes.get(key);
    if (!h || h.size === 0) return {};
    return Object.fromEntries(h.entries());
  }

  function pipeline() {
    type PipelineCommand = () => Promise<unknown>;
    const commands: PipelineCommand[] = [];

    const pipelineProxy = {
      set(key: string, value: unknown, options?: SetOptions) {
        commands.push(() => set(key, value, options));
        return pipelineProxy;
      },
      get(key: string) {
        commands.push(() => get(key));
        return pipelineProxy;
      },
      del(key: string) {
        commands.push(() => del(key));
        return pipelineProxy;
      },
      zadd(key: string, entry: ZAddEntry | ZAddEntry[]) {
        commands.push(() => zadd(key, entry));
        return pipelineProxy;
      },
      zrem(key: string, ...members: string[]) {
        commands.push(() => zrem(key, ...members));
        return pipelineProxy;
      },
      hset(key: string, fieldValues: Record<string, string | number>) {
        commands.push(() => hset(key, fieldValues));
        return pipelineProxy;
      },
      hdel(key: string, ...fields: string[]) {
        commands.push(() => hdel(key, ...fields));
        return pipelineProxy;
      },
      async exec(): Promise<Array<[Error | null, unknown]>> {
        const results: Array<[Error | null, unknown]> = [];
        for (const cmd of commands) {
          try {
            const result = await cmd();
            results.push([null, result]);
          } catch (err) {
            results.push([err as Error, null]);
          }
        }
        return results;
      },
    };

    return pipelineProxy;
  }

  const ns = (...parts: string[]) => parts.join(":");

  // Register the most recently created instance as the active one
  activeReset = () => {
    kv.clear();
    zsets.clear();
    hashes.clear();
  };

  return {
    ns,
    redis: {
      get,
      set,
      setex,
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
      hgetall,
      pipeline,
    },
    reset: resetInMemoryRedis,
  } as const;
}

export type InMemoryRedis = ReturnType<typeof makeInMemoryRedis>;
