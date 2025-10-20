/* @vitest-environment node */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  storeImage: vi.fn(async () => ({
    url: "https://test-bucket.test-account.r2.cloudflarestorage.com/abcdef0123456789abcdef0123456789/32x32.webp",
    key: "abcdef0123456789abcdef0123456789/32x32.webp",
  })),
  getFaviconTtlSeconds: vi.fn(() => 60),
}));

vi.mock("@/lib/storage", () => storageMock);
vi.stubEnv("R2_ACCOUNT_ID", "test-account");
vi.stubEnv("R2_ACCESS_KEY_ID", "akid");
vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
vi.stubEnv("R2_BUCKET", "test-bucket");

// Mock sharp to return a pipeline that resolves a buffer (now using webp)
vi.mock("sharp", () => ({
  default: (_input: unknown, _opts?: unknown) => ({
    resize: () => ({
      webp: () => ({
        toBuffer: async () => Buffer.from([1, 2, 3]),
      }),
    }),
  }),
}));

beforeAll(async () => {
  const { makeInMemoryRedis } = await import("@/lib/redis-mock");
  const impl = makeInMemoryRedis();
  vi.doMock("@/lib/redis", () => impl);
});

// Import after mocks
let getOrCreateFaviconBlobUrl: typeof import("./favicon").getOrCreateFaviconBlobUrl;
beforeAll(async () => {
  ({ getOrCreateFaviconBlobUrl } = await import("./favicon"));
});

afterEach(async () => {
  vi.restoreAllMocks();
  storageMock.storeImage.mockReset();
  const { resetInMemoryRedis } = await import("@/lib/redis-mock");
  resetInMemoryRedis();
});

describe("getOrCreateFaviconBlobUrl", () => {
  it("returns existing blob url when present", async () => {
    const key = `favicon:url:${"example.com"}:${32}`;
    const { redis } = await import("@/lib/redis");
    await redis.set(key, {
      url: "blob://existing-url",
      expiresAtMs: Date.now() + 1000,
    });
    const out = await getOrCreateFaviconBlobUrl("example.com");
    expect(out.url).toBe("blob://existing-url");
    expect(storageMock.storeImage).not.toHaveBeenCalled();
  });

  it("reads object values from redis index", async () => {
    const key = `favicon:url:${"legacy.com"}:${32}`;
    const { redis } = await import("@/lib/redis");
    await redis.set(key, {
      url: "https://blob/legacy.png",
      expiresAtMs: Date.now() + 1000,
    });
    const out = await getOrCreateFaviconBlobUrl("legacy.com");
    expect(out.url).toBe("https://blob/legacy.png");
  });

  it("accepts object values from redis client auto-parse", async () => {
    const key = `favicon:url:${"object.com"}:${32}`;
    // Simulate a client returning an already-parsed object
    const { redis } = await import("@/lib/redis");
    await redis.set(key, {
      url: "https://blob/object.png",
      expiresAtMs: Date.now() + 1000,
    });
    const out = await getOrCreateFaviconBlobUrl("object.com");
    expect(out.url).toBe("https://blob/object.png");
  });

  it("fetches, converts, stores, and returns url when not cached", async () => {
    const body = new Uint8Array([137, 80, 78, 71]); // pretend PNG signature bytes
    const resp = new Response(body, {
      status: 200,
      headers: { "content-type": "image/png" },
    });
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(resp);

    const out = await getOrCreateFaviconBlobUrl("example.com");
    expect(out.url).toMatch(
      /^https:\/\/test-bucket\.test-account\.r2\.cloudflarestorage\.com\/abcdef0123456789abcdef0123456789\/32x32\.webp$/,
    );
    expect(storageMock.storeImage).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("returns null when all sources fail", async () => {
    const notOk = new Response(null, { status: 404 });
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(notOk);
    const out = await getOrCreateFaviconBlobUrl("nope.invalid");
    expect(out.url).toBeNull();
    fetchSpy.mockRestore();
  });

  it("negative-caches failures to avoid repeat fetch", async () => {
    const notOk = new Response(null, { status: 404 });
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(notOk);

    // First call: miss -> fetch attempts -> negative cache
    const first = await getOrCreateFaviconBlobUrl("negcache.example");
    expect(first.url).toBeNull();
    expect(fetchSpy).toHaveBeenCalled();

    // Second call: should hit negative cache and not fetch again
    fetchSpy.mockClear();
    const second = await getOrCreateFaviconBlobUrl("negcache.example");
    expect(second.url).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
