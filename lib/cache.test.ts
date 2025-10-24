/* @vitest-environment node */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

let getOrCreateCachedAsset: typeof import("@/lib/cache").getOrCreateCachedAsset;

const ns = (...parts: string[]) => parts.join(":");

describe("cached assets", () => {
  beforeAll(async () => {
    const { makeInMemoryRedis } = await import("@/lib/redis-mock");
    const impl = makeInMemoryRedis();
    vi.doMock("@/lib/redis", () => impl);
    ({ getOrCreateCachedAsset } = await import("@/lib/cache"));
  });
  beforeEach(async () => {
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns cached URL on hit", async () => {
    const indexKey = ns("test", "asset");
    const lockKey = ns("lock", "test", "asset");

    // seed cache
    await (await import("@/lib/redis")).redis.set(indexKey, {
      url: "https://cdn/x.webp",
    });

    const result = await getOrCreateCachedAsset<{ source: string }>({
      indexKey,
      lockKey,
      ttlSeconds: 60,
      produceAndUpload: async () => ({
        url: "https://cdn/y.webp",
        key: "k",
        metrics: { source: "upload" },
      }),
    });

    expect(result).toEqual({ url: "https://cdn/x.webp" });
  });

  it("waits for result when lock not acquired and cached result exists", async () => {
    const indexKey = ns("test", "asset2");
    const lockKey = ns("lock", "test", "asset2");

    // Simulate another worker already storing result
    const { redis } = await import("@/lib/redis");
    await redis.set(lockKey, "1");
    await redis.set(indexKey, { url: "https://cdn/wait.webp" });

    const result = await getOrCreateCachedAsset<{ source: string }>({
      indexKey,
      lockKey,
      ttlSeconds: 60,
      produceAndUpload: async () => ({ url: "https://cdn/unused.webp" }),
    });

    expect(result).toEqual({ url: "https://cdn/wait.webp" });
  });

  it("produces, stores, and returns new asset under lock", async () => {
    const indexKey = ns("test", "asset3");
    const lockKey = ns("lock", "test", "asset3");

    const result = await getOrCreateCachedAsset<{ source: string }>({
      indexKey,
      lockKey,
      ttlSeconds: 60,
      purgeQueue: "purge-test",
      produceAndUpload: async () => ({
        url: "https://cdn/new.webp",
        key: "object-key",
        metrics: { source: "upload" },
      }),
    });

    expect(result).toEqual({ url: "https://cdn/new.webp" });

    const { redis } = await import("@/lib/redis");
    const stored = (await redis.get(indexKey)) as {
      url?: string;
      key?: string;
    } | null;
    expect(stored?.url).toBe("https://cdn/new.webp");
  });

  it("propagates not_found via cached null", async () => {
    const indexKey = ns("test", "asset4");
    const lockKey = ns("lock", "test", "asset4");

    const result = await getOrCreateCachedAsset<{ source: string }>({
      indexKey,
      lockKey,
      ttlSeconds: 60,
      produceAndUpload: async () => ({ url: null }),
    });

    expect(result).toEqual({ url: null });
  });
});
