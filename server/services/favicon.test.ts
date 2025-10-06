/* @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  uploadImage: vi.fn(async () => ({
    url: "https://app.ufs.sh/f/stored-url",
    key: "ut-key",
  })),
}));

vi.mock("@/lib/storage", () => storageMock);

// Mock sharp to return a pipeline that resolves a buffer
vi.mock("sharp", () => ({
  default: (_input: unknown, _opts?: unknown) => ({
    resize: () => ({
      png: () => ({
        toBuffer: async () => Buffer.from([1, 2, 3]),
      }),
    }),
  }),
}));

// Import after mocks
import { getOrCreateFaviconBlobUrl } from "./favicon";

afterEach(() => {
  vi.restoreAllMocks();
  storageMock.uploadImage.mockReset();
  global.__redisTestHelper.reset();
});

describe("getOrCreateFaviconBlobUrl", () => {
  it("returns existing blob url when present", async () => {
    const key = `favicon:url:${"example.com"}:${32}`;
    global.__redisTestHelper.store.set(key, {
      url: "blob://existing-url",
      expiresAtMs: Date.now() + 1000,
    });
    const out = await getOrCreateFaviconBlobUrl("example.com");
    expect(out.url).toBe("blob://existing-url");
    expect(storageMock.uploadImage).not.toHaveBeenCalled();
  });

  it("reads object values from redis index", async () => {
    const key = `favicon:url:${"legacy.com"}:${32}`;
    global.__redisTestHelper.store.set(key, {
      url: "https://blob/legacy.png",
      expiresAtMs: Date.now() + 1000,
    });
    const out = await getOrCreateFaviconBlobUrl("legacy.com");
    expect(out.url).toBe("https://blob/legacy.png");
  });

  it("accepts object values from redis client auto-parse", async () => {
    const key = `favicon:url:${"object.com"}:${32}`;
    // Simulate a client returning an already-parsed object
    global.__redisTestHelper.store.set(key, {
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
    expect(out.url).toBe("https://app.ufs.sh/f/stored-url");
    expect(storageMock.uploadImage).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("returns null when all sources fail", async () => {
    const notOk = new Response(null, { status: 404 });
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(notOk);
    const out = await getOrCreateFaviconBlobUrl("nope.invalid");
    expect(out.url).toBeNull();
    fetchSpy.mockRestore();
  });
});
