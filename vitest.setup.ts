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
  const zsets = new Map<string, Map<string, number>>();

  function getZset(key: string): Map<string, number> {
    let m = zsets.get(key);
    if (!m) {
      m = new Map<string, number>();
      zsets.set(key, m);
    }
    return m;
  }

  const ns = (...parts: string[]) => parts.join(":");

  const redis = {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async set(key: string, value: unknown, _opts?: unknown) {
      store.set(key, value);
      return "OK" as const;
    },
    async del(key: string) {
      return store.delete(key) ? 1 : 0;
    },
    async incr(key: string) {
      const current = Number(store.get(key) ?? "0");
      const next = current + 1;
      store.set(key, String(next));
      return next;
    },
    async expire(_key: string, _seconds: number) {
      return 1;
    },
    async ttl(_key: string) {
      return 60;
    },
    async exists(key: string) {
      return store.has(key) ? 1 : 0;
    },
    async zadd(
      key: string,
      entry:
        | { score: number; member: string }
        | Array<{ score: number; member: string }>,
    ) {
      const z = getZset(key);
      const list = Array.isArray(entry) ? entry : [entry];
      for (const e of list) z.set(e.member, e.score);
      return list.length;
    },
    async zrange(
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
    },
    async zrem(key: string, ...members: string[]) {
      const z = getZset(key);
      let removed = 0;
      for (const m of members) {
        if (z.delete(m)) removed++;
      }
      return removed;
    },
  } as const;

  const __redisTestHelper = {
    store,
    zsets,
    reset() {
      store.clear();
      for (const m of zsets.values()) m.clear();
    },
  } as const;

  return {
    ns,
    redis,
    __redisTestHelper,
    store,
    zsets,
    reset: __redisTestHelper.reset,
  } as const;
});

vi.mock("@/lib/redis", () => __redisImpl);

// Minimal Drizzle DB client mock to avoid Neon requirements in tests
const __dbImpl = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  interface QueryBuilder<T extends Row> {
    limit: (n?: number) => Promise<T[]>;
    where: (_cond: unknown) => QueryBuilder<T>;
  }
  function makeQueryResult<T extends Row>(rows: T[]): QueryBuilder<T> {
    return {
      limit: async (n?: number) =>
        rows.slice(0, typeof n === "number" ? n : rows.length),
      where: (_cond: unknown) => makeQueryResult(rows),
    } as QueryBuilder<T>;
  }

  const select = vi.fn(() => ({
    from: vi.fn(() => makeQueryResult<Record<string, unknown>>([])),
  }));

  const del = vi.fn(() => ({
    where: async (_cond: unknown) => 0,
  }));

  const insert = vi.fn(() => ({
    values: vi.fn(() => ({
      onConflictDoUpdate: vi.fn(() => ({
        returning: async () => [{ id: "test-id" } as Row],
      })),
      returning: async () => [{ id: "test-id" } as Row],
    })),
  }));

  return { db: { select, delete: del, insert } };
});

vi.mock("@/server/db/client", () => __dbImpl);

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
  store: (__redisImpl as unknown as { store: Map<string, unknown> }).store,
  zsets: (__redisImpl as unknown as { zsets: Map<string, Map<string, number>> })
    .zsets,
  reset: (__redisImpl as unknown as { reset: () => void }).reset,
};
// Also attach to Node's global for tests using global.__redisTestHelper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).__redisTestHelper = globalThis.__redisTestHelper;

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
