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
import type { DeleteResult } from "@/lib/blob";

const blobPutMock = vi.hoisted(() =>
  vi.fn(async (pathname: string) => ({
    url: `https://test-store.public.blob.vercel-storage.com/${pathname}`,
    downloadUrl: `https://test-store.public.blob.vercel-storage.com/${pathname}?download=1`,
    contentType: "image/webp",
  })),
);

const blobDelMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@vercel/blob", () => ({
  put: blobPutMock,
  del: blobDelMock,
}));

const deleteBlobsMock = vi.hoisted(() =>
  vi.fn<(urls: string[]) => Promise<DeleteResult>>(async () => []),
);

vi.mock("@/lib/blob", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/blob")>();
  return {
    ...actual,
    deleteBlobs: deleteBlobsMock,
  };
});

vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
vi.stubEnv("BLOB_SIGNING_SECRET", "secret");

import { storeImage } from "./storage";

afterEach(() => {
  vi.restoreAllMocks();
  blobPutMock.mockClear();
  blobDelMock.mockClear();
  deleteBlobsMock.mockClear();
});

describe("storage uploads", () => {
  it("storeImage (favicon) returns Vercel Blob public URL and pathname", async () => {
    const res = await storeImage({
      kind: "favicon",
      domain: "example.com",
      buffer: Buffer.from([1, 2, 3]),
      width: 32,
      height: 32,
    });
    expect(res.url).toMatch(
      /^https:\/\/.*\.blob\.vercel-storage\.com\/[a-f0-9]{32}\/32x32\./,
    );
    expect(res.pathname).toMatch(/^[a-f0-9]{32}\/32x32\./);
    expect(blobPutMock).toHaveBeenCalledTimes(1);
  });

  it("storeImage (screenshot) returns Vercel Blob public URL and pathname", async () => {
    const res = await storeImage({
      kind: "screenshot",
      domain: "example.com",
      buffer: Buffer.from([4, 5, 6]),
      width: 1200,
      height: 630,
    });
    expect(res.url).toMatch(
      /^https:\/\/.*\.blob\.vercel-storage\.com\/[a-f0-9]{32}\/1200x630\./,
    );
    expect(res.pathname).toMatch(/^[a-f0-9]{32}\/1200x630\./);
    expect(blobPutMock).toHaveBeenCalledTimes(1);
  });

  it("retries on upload failure and succeeds on second attempt", async () => {
    blobPutMock
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        url: "https://test-store.public.blob.vercel-storage.com/favicon/hash/32x32.webp",
        downloadUrl:
          "https://test-store.public.blob.vercel-storage.com/favicon/hash/32x32.webp?download=1",
        contentType: "image/webp",
      });

    const res = await storeImage({
      kind: "favicon",
      domain: "retry.com",
      buffer: Buffer.from([1, 2, 3]),
      width: 32,
      height: 32,
    });

    expect(res.url).toMatch(/^https:\/\/.*\.blob\.vercel-storage\.com\//);
    expect(res.pathname).toMatch(/^[a-f0-9]{32}\/32x32\./);
    expect(blobPutMock).toHaveBeenCalledTimes(2);
  });

  it("retries once on transient failure then succeeds", async () => {
    blobPutMock
      .mockRejectedValueOnce(new Error("Transient"))
      .mockResolvedValueOnce({
        url: "https://test-store.public.blob.vercel-storage.com/favicon/hash/32x32.webp",
        downloadUrl:
          "https://test-store.public.blob.vercel-storage.com/favicon/hash/32x32.webp?download=1",
        contentType: "image/webp",
      });

    const res = await storeImage({
      kind: "favicon",
      domain: "retry.com",
      buffer: Buffer.from([1, 2, 3]),
      width: 32,
      height: 32,
    });

    expect(res.url).toMatch(/^https:\/\/.*\.blob\.vercel-storage\.com\//);
    expect(res.pathname).toMatch(/^[a-f0-9]{32}\/32x32\./);
    expect(blobPutMock).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting all retry attempts", async () => {
    blobPutMock.mockRejectedValue(new Error("Persistent error"));

    await expect(
      storeImage({
        kind: "favicon",
        domain: "fail.com",
        buffer: Buffer.from([1, 2, 3]),
        width: 32,
        height: 32,
      }),
    ).rejects.toThrow(/Upload failed after 3 attempts/);

    expect(blobPutMock).toHaveBeenCalledTimes(3);
  });

  it("succeeds after initial failure", async () => {
    blobPutMock
      .mockRejectedValueOnce(new Error("Blob API error"))
      .mockResolvedValueOnce({
        url: "https://test-store.public.blob.vercel-storage.com/favicon/hash/32x32.webp",
        downloadUrl:
          "https://test-store.public.blob.vercel-storage.com/favicon/hash/32x32.webp?download=1",
        contentType: "image/webp",
      });

    const res = await storeImage({
      kind: "favicon",
      domain: "error.com",
      buffer: Buffer.from([1, 2, 3]),
      width: 32,
      height: 32,
    });

    expect(res.url).toMatch(/^https:\/\/.*\.blob\.vercel-storage\.com\//);
    expect(res.pathname).toMatch(/^[a-f0-9]{32}\/32x32\./);
    expect(blobPutMock).toHaveBeenCalledTimes(2);
  });
});

describe("pruneDueBlobsOnce", () => {
  let pruneDueBlobsOnce: typeof import("./storage").pruneDueBlobsOnce;

  beforeAll(async () => {
    const { makeInMemoryRedis } = await import("@/lib/redis-mock");
    const impl = makeInMemoryRedis();
    vi.doMock("@/lib/redis", () => impl);
    ({ pruneDueBlobsOnce } = await import("./storage"));
  });

  beforeEach(async () => {
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();
  });

  afterEach(async () => {
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();
  });

  it("only removes successfully deleted items from queue", async () => {
    const { redis, ns } = await import("@/lib/redis");

    await redis.zadd(ns("purge", "favicon"), {
      score: 100,
      member: "https://test.blob.vercel-storage.com/test-url-1",
    });
    await redis.zadd(ns("purge", "favicon"), {
      score: 100,
      member: "https://test.blob.vercel-storage.com/test-url-2",
    });

    deleteBlobsMock.mockResolvedValueOnce([
      {
        url: "https://test.blob.vercel-storage.com/test-url-1",
        deleted: false,
        error: "Access denied",
      },
      {
        url: "https://test.blob.vercel-storage.com/test-url-2",
        deleted: true,
      },
    ]);

    const result = await pruneDueBlobsOnce(200);

    expect(result.deletedCount).toBe(1);
    expect(result.errorCount).toBe(1);

    // Only successful item should be removed
    const remaining = await redis.zrange(ns("purge", "favicon"), 0, -1);
    expect(remaining).toEqual([
      "https://test.blob.vercel-storage.com/test-url-1",
    ]);
    expect(remaining).not.toContain(
      "https://test.blob.vercel-storage.com/test-url-2",
    );
  });

  it("does not reprocess failed items within one run", async () => {
    const { redis, ns } = await import("@/lib/redis");

    // Add items to purge queue first
    await redis.zadd(ns("purge", "favicon"), {
      score: 100,
      member: "https://test.blob.vercel-storage.com/url-1",
    });
    await redis.zadd(ns("purge", "favicon"), {
      score: 100,
      member: "https://test.blob.vercel-storage.com/url-2",
    });
    await redis.zadd(ns("purge", "favicon"), {
      score: 100,
      member: "https://test.blob.vercel-storage.com/url-3",
    });
    await redis.zadd(ns("purge", "favicon"), {
      score: 100,
      member: "https://test.blob.vercel-storage.com/url-4",
    });

    // Mock deleteBlobs to fail on first two items, succeed on others
    deleteBlobsMock.mockResolvedValueOnce([
      {
        url: "https://test.blob.vercel-storage.com/url-1",
        deleted: false,
        error: "Access denied",
      },
      {
        url: "https://test.blob.vercel-storage.com/url-2",
        deleted: false,
        error: "Access denied",
      },
      { url: "https://test.blob.vercel-storage.com/url-3", deleted: true },
    ]);

    // Second call should only receive non-failed items (url-4)
    deleteBlobsMock.mockResolvedValueOnce([
      { url: "https://test.blob.vercel-storage.com/url-4", deleted: true },
    ]);

    const result = await pruneDueBlobsOnce(200, 3);

    // Verify deleteBlobs was called correctly
    expect(deleteBlobsMock).toHaveBeenCalledTimes(2);

    // First call should have all 3 items
    expect(deleteBlobsMock).toHaveBeenNthCalledWith(1, [
      "https://test.blob.vercel-storage.com/url-1",
      "https://test.blob.vercel-storage.com/url-2",
      "https://test.blob.vercel-storage.com/url-3",
    ]);

    // Second call should only have url-4 (url-1 and url-2 are filtered out)
    expect(deleteBlobsMock).toHaveBeenNthCalledWith(2, [
      "https://test.blob.vercel-storage.com/url-4",
    ]);

    expect(result.deletedCount).toBe(2);
    expect(result.errorCount).toBe(2);

    // Verify failed items are still in the queue
    const remaining = await redis.zrange(ns("purge", "favicon"), 0, -1);
    expect(remaining).toContain("https://test.blob.vercel-storage.com/url-1");
    expect(remaining).toContain("https://test.blob.vercel-storage.com/url-2");
    expect(remaining).not.toContain(
      "https://test.blob.vercel-storage.com/url-3",
    );
    expect(remaining).not.toContain(
      "https://test.blob.vercel-storage.com/url-4",
    );
  });

  it("returns counts instead of full arrays", async () => {
    const { redis, ns } = await import("@/lib/redis");

    await redis.zadd(ns("purge", "favicon"), {
      score: 100,
      member: "https://test.blob.vercel-storage.com/url-1",
    });
    await redis.zadd(ns("purge", "favicon"), {
      score: 100,
      member: "https://test.blob.vercel-storage.com/url-2",
    });
    await redis.zadd(ns("purge", "favicon"), {
      score: 100,
      member: "https://test.blob.vercel-storage.com/url-3",
    });

    deleteBlobsMock.mockResolvedValueOnce([
      { url: "https://test.blob.vercel-storage.com/url-1", deleted: true },
      { url: "https://test.blob.vercel-storage.com/url-2", deleted: true },
      {
        url: "https://test.blob.vercel-storage.com/url-3",
        deleted: false,
        error: "Failed",
      },
    ]);

    const result = await pruneDueBlobsOnce(200);

    expect(result).toEqual({
      deletedCount: 2,
      errorCount: 1,
    });
    expect(result).not.toHaveProperty("deleted");
    expect(result).not.toHaveProperty("errors");
  });
});
