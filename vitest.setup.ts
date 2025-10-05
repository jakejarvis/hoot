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
  const ns = (n: string, id: string) => `${n}:${id}`;
  const get = vi.fn(async (key: string) =>
    store.has(key) ? store.get(key) : null,
  );
  const set = vi.fn(
    async (key: string, value: unknown, _opts?: { ex?: number }) => {
      store.set(key, value);
    },
  );
  const del = vi.fn(async (key: string) => {
    store.delete(key);
  });
  const reset = () => {
    store.clear();
    get.mockClear();
    set.mockClear();
    del.mockClear();
  };
  return {
    store,
    ns,
    redis: { get, set, del },
    get,
    set,
    del,
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
    reset: () => void;
  };
}
// Assign to global for convenient access in tests
globalThis.__redisTestHelper = {
  store: __redisImpl.store,
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
