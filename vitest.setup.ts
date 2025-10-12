import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Global mocks for analytics capture to avoid network/log noise in tests
vi.mock("@/lib/analytics/server", () => ({
  captureServer: vi.fn(async () => undefined),
}));
vi.mock("@/lib/analytics/client", () => ({ captureClient: vi.fn() }));

// Make server-only a no-op so we can import server modules in tests
vi.mock("server-only", () => ({}));

// Global Redis mock to prevent Upstash calls and reduce repetition across tests
const __redisImpl = vi.hoisted(() => {
  const store = new Map<string, unknown>();
  // simple sorted-set implementation: key -> Map(member -> score)
  const zsets = new Map<string, Map<string, number>>();
  const ns = (n: string, id?: string) => `${n}${id ? `:${id}` : ""}`;

  const get = vi.fn(async (key: string) =>
    store.has(key) ? store.get(key) : null,
  );
  const set = vi.fn(
    async (
      key: string,
      value: unknown,
      opts?: { ex?: number; nx?: boolean },
    ) => {
      if (opts?.nx && store.has(key)) {
        return null; // NX failed - key exists
      }
      store.set(key, value);
      return "OK";
    },
  );
  const del = vi.fn(async (key: string) => {
    store.delete(key);
  });

  const exists = vi.fn(async (key: string) => {
    return store.has(key) ? 1 : 0;
  });

  function ensureZ(key: string): Map<string, number> {
    let m = zsets.get(key);
    if (!m) {
      m = new Map<string, number>();
      zsets.set(key, m);
    }
    return m;
  }
  const zadd = vi.fn(
    async (key: string, arg: { score: number; member: string }) => {
      const m = ensureZ(key);
      m.set(arg.member, arg.score);
      return 1;
    },
  );
  const zrem = vi.fn(async (key: string, ...members: string[]) => {
    const m = ensureZ(key);
    let removed = 0;
    for (const mem of members) {
      if (m.delete(mem)) removed += 1;
    }
    return removed;
  });
  const zrange = vi.fn(
    async (
      key: string,
      min: number,
      max: number,
      options?: {
        byScore?: boolean;
        limit?: { offset: number; count: number };
      },
    ) => {
      const m = zsets.get(key);
      if (!m) return [] as string[];
      const pairs = [...m.entries()].filter(
        ([, score]) => score >= min && score <= max,
      );
      pairs.sort((a, b) => a[1] - b[1]);
      const start = options?.limit?.offset ?? 0;
      const end = start + (options?.limit?.count ?? pairs.length);
      return pairs.slice(start, end).map(([member]) => member);
    },
  );

  const acquireLockOrWaitForResult = vi.fn(
    async <T = unknown>(options: {
      lockKey: string;
      resultKey: string;
      lockTtl?: number;
      pollIntervalMs?: number;
      maxWaitMs?: number;
    }) => {
      const { lockKey, resultKey } = options;

      // Try to acquire lock
      if (!store.has(lockKey)) {
        store.set(lockKey, "1");
        return { acquired: true, cachedResult: null };
      }

      // Lock not acquired, check for cached result
      const result = store.get(resultKey) as T | null;
      if (result !== null && result !== undefined) {
        return { acquired: false, cachedResult: result };
      }

      // No result found
      return { acquired: false, cachedResult: null };
    },
  );

  const reset = () => {
    store.clear();
    zsets.clear();
    get.mockClear();
    set.mockClear();
    del.mockClear();
    exists.mockClear();
    zadd.mockClear();
    zrem.mockClear();
    zrange.mockClear();
    acquireLockOrWaitForResult.mockClear();
  };
  return {
    store,
    zsets,
    ns,
    redis: { get, set, del, exists, zadd, zrem, zrange },
    get,
    set,
    del,
    exists,
    zadd,
    zrem,
    zrange,
    acquireLockOrWaitForResult,
    reset,
  };
});

vi.mock("@/lib/redis", () => __redisImpl);

// Expose for tests that want to clear or assert cache interactions
declare global {
  // Makes the test helper available in the test environment
  // without polluting production types
  var __redisTestHelper: {
    store: Map<string, unknown>;
    zsets: Map<string, Map<string, number>>;
    reset: () => void;
  };
}
// Assign to global for convenient access in tests
globalThis.__redisTestHelper = {
  store: __redisImpl.store,
  zsets: __redisImpl.zsets,
  reset: __redisImpl.reset,
};

// Note: The unstable_cache mock is intentionally a no-op. We are testing
// function behavior, not caching semantics. If we need cache behavior,
// replace this with a tiny in-memory map keyed by args.
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(
    fn: T,
    _key: unknown,
    _opts: unknown,
  ) => fn,
}));
