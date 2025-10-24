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
import type { DeleteResult } from "@/lib/r2";

const s3Send = vi.hoisted(() => vi.fn(async () => ({})));
const deleteObjectsMock = vi.hoisted(() =>
  vi.fn<(keys: string[]) => Promise<DeleteResult>>(async () => []),
);

vi.mock("@aws-sdk/client-s3", () => {
  return {
    // biome-ignore lint/complexity/useArrowFunction: Vitest v4 requires function keyword for constructor mocks
    S3Client: vi.fn().mockImplementation(function () {
      return { send: s3Send };
    }),
    // biome-ignore lint/complexity/useArrowFunction: Vitest v4 requires function keyword for constructor mocks
    PutObjectCommand: vi.fn().mockImplementation(function (input) {
      return { input };
    }),
    // biome-ignore lint/complexity/useArrowFunction: Vitest v4 requires function keyword for constructor mocks
    DeleteObjectsCommand: vi.fn().mockImplementation(function (input) {
      return { input };
    }),
  };
});

vi.mock("@/lib/r2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/r2")>();
  return {
    ...actual,
    deleteObjects: deleteObjectsMock,
  };
});

vi.stubEnv("R2_ACCOUNT_ID", "test-account");
vi.stubEnv("R2_ACCESS_KEY_ID", "akid");
vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
vi.stubEnv("R2_BUCKET", "test-bucket");
vi.stubEnv("BLOB_SIGNING_SECRET", "secret");

import { storeImage } from "./storage";

afterEach(() => {
  vi.restoreAllMocks();
  s3Send.mockClear();
  deleteObjectsMock.mockClear();
});

describe("storage uploads", () => {
  it("storeImage (favicon) returns R2 public URL and key and calls S3", async () => {
    const res = await storeImage({
      kind: "favicon",
      domain: "example.com",
      buffer: Buffer.from([1, 2, 3]),
      width: 32,
      height: 32,
    });
    expect(res.url).toMatch(
      /^https:\/\/test-bucket\.test-account\.r2\.cloudflarestorage\.com\/[a-f0-9]{32}\/32x32\.bin$/,
    );
    expect(res.key).toMatch(/^[a-f0-9]{32}\/32x32\.bin$/);
    expect(s3Send).toHaveBeenCalledTimes(1);
  });

  it("storeImage (screenshot) returns R2 public URL and key and calls S3", async () => {
    const res = await storeImage({
      kind: "screenshot",
      domain: "example.com",
      buffer: Buffer.from([4, 5, 6]),
      width: 1200,
      height: 630,
    });
    expect(res.url).toMatch(
      /^https:\/\/test-bucket\.test-account\.r2\.cloudflarestorage\.com\/[a-f0-9]{32}\/1200x630\.bin$/,
    );
    expect(res.key).toMatch(/^[a-f0-9]{32}\/1200x630\.bin$/);
    expect(s3Send).toHaveBeenCalledTimes(1);
  });

  it("retries on upload failure and succeeds on second attempt", async () => {
    s3Send
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({});

    const res = await storeImage({
      kind: "favicon",
      domain: "retry.com",
      buffer: Buffer.from([1, 2, 3]),
      width: 32,
      height: 32,
    });

    expect(res.url).toMatch(
      /^https:\/\/test-bucket\.test-account\.r2\.cloudflarestorage\.com\/[a-f0-9]{32}\/32x32\.bin$/,
    );
    expect(res.key).toMatch(/^[a-f0-9]{32}\/32x32\.bin$/);
    expect(s3Send).toHaveBeenCalledTimes(2);
  });

  it("retries once on transient failure then succeeds", async () => {
    s3Send
      .mockRejectedValueOnce(new Error("Transient"))
      .mockResolvedValueOnce({});

    const res = await storeImage({
      kind: "favicon",
      domain: "retry.com",
      buffer: Buffer.from([1, 2, 3]),
      width: 32,
      height: 32,
    });

    expect(res.url).toMatch(
      /^https:\/\/test-bucket\.test-account\.r2\.cloudflarestorage\.com\/[a-f0-9]{32}\/32x32\.bin$/,
    );
    expect(res.key).toMatch(/^[a-f0-9]{32}\/32x32\.bin$/);
    expect(s3Send).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting all retry attempts", async () => {
    s3Send.mockRejectedValue(new Error("Persistent error"));

    await expect(
      storeImage({
        kind: "favicon",
        domain: "fail.com",
        buffer: Buffer.from([1, 2, 3]),
        width: 32,
        height: 32,
      }),
    ).rejects.toThrow(/Upload failed after 3 attempts/);

    expect(s3Send).toHaveBeenCalledTimes(3);
  });

  it("succeeds after initial failure", async () => {
    s3Send
      .mockRejectedValueOnce(new Error("S3 API error"))
      .mockResolvedValueOnce({});

    const res = await storeImage({
      kind: "favicon",
      domain: "error.com",
      buffer: Buffer.from([1, 2, 3]),
      width: 32,
      height: 32,
    });

    expect(res.url).toMatch(
      /^https:\/\/test-bucket\.test-account\.r2\.cloudflarestorage\.com\/[a-f0-9]{32}\/32x32\.bin$/,
    );
    expect(res.key).toMatch(/^[a-f0-9]{32}\/32x32\.bin$/);
    expect(s3Send).toHaveBeenCalledTimes(2);
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
      member: "test-key-1",
    });
    await redis.zadd(ns("purge", "favicon"), {
      score: 100,
      member: "test-key-2",
    });

    deleteObjectsMock.mockResolvedValueOnce([
      { key: "test-key-1", deleted: false, error: "Access denied" },
      { key: "test-key-2", deleted: true },
    ]);

    const result = await pruneDueBlobsOnce(200);

    expect(result.deletedCount).toBe(1);
    expect(result.errorCount).toBe(1);

    // Only successful item should be removed
    const remaining = await redis.zrange(ns("purge", "favicon"), 0, -1);
    expect(remaining).toEqual(["test-key-1"]);
    expect(remaining).not.toContain("test-key-2");
  });

  it("does not reprocess failed items within one run", async () => {
    const { redis, ns } = await import("@/lib/redis");

    // Add items to purge queue first
    await redis.zadd(ns("purge", "favicon"), {
      score: 100,
      member: "test-key-1",
    });
    await redis.zadd(ns("purge", "favicon"), {
      score: 100,
      member: "test-key-2",
    });
    await redis.zadd(ns("purge", "favicon"), {
      score: 100,
      member: "test-key-3",
    });
    await redis.zadd(ns("purge", "favicon"), {
      score: 100,
      member: "test-key-4",
    });

    // Mock deleteObjects to fail on first two items, succeed on others
    deleteObjectsMock.mockResolvedValueOnce([
      { key: "test-key-1", deleted: false, error: "Access denied" },
      { key: "test-key-2", deleted: false, error: "Access denied" },
      { key: "test-key-3", deleted: true },
    ]);

    // Second call should only receive non-failed items (test-key-4)
    deleteObjectsMock.mockResolvedValueOnce([
      { key: "test-key-4", deleted: true },
    ]);

    const result = await pruneDueBlobsOnce(200, 3);

    // Verify deleteObjects was called correctly
    expect(deleteObjectsMock).toHaveBeenCalledTimes(2);

    // First call should have all 3 items
    expect(deleteObjectsMock).toHaveBeenNthCalledWith(1, [
      "test-key-1",
      "test-key-2",
      "test-key-3",
    ]);

    // Second call should only have test-key-4 (test-key-1 and test-key-2 are filtered out)
    expect(deleteObjectsMock).toHaveBeenNthCalledWith(2, ["test-key-4"]);

    expect(result.deletedCount).toBe(2);
    expect(result.errorCount).toBe(2);

    // Verify failed items are still in the queue
    const remaining = await redis.zrange(ns("purge", "favicon"), 0, -1);
    expect(remaining).toContain("test-key-1");
    expect(remaining).toContain("test-key-2");
    expect(remaining).not.toContain("test-key-3");
    expect(remaining).not.toContain("test-key-4");
  });

  it("returns counts instead of full arrays", async () => {
    const { redis, ns } = await import("@/lib/redis");

    await redis.zadd(ns("purge", "favicon"), {
      score: 100,
      member: "test-key-1",
    });
    await redis.zadd(ns("purge", "favicon"), {
      score: 100,
      member: "test-key-2",
    });
    await redis.zadd(ns("purge", "favicon"), {
      score: 100,
      member: "test-key-3",
    });

    deleteObjectsMock.mockResolvedValueOnce([
      { key: "test-key-1", deleted: true },
      { key: "test-key-2", deleted: true },
      { key: "test-key-3", deleted: false, error: "Failed" },
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
