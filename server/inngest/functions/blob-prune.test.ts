/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const utMock = vi.hoisted(() => ({
  deleteFiles: vi.fn(async (_keys: string[]) => undefined),
}));
vi.mock("uploadthing/server", () => ({
  UTApi: vi.fn().mockImplementation(() => utMock),
}));

describe("blob-prune Inngest function", () => {
  beforeAll(async () => {
    const { makeInMemoryRedis } = await import("@/lib/redis-mock");
    const impl = makeInMemoryRedis();
    vi.doMock("@/lib/redis", () => impl);
  });

  beforeEach(async () => {
    const { redis, ns } = await import("@/lib/redis");
    const { resetInMemoryRedis } = await import("@/lib/redis-mock");
    resetInMemoryRedis();
    await redis.zadd(ns("purge", "favicon"), {
      score: Date.now(),
      member: "ut-key-f1",
    });
    await redis.zadd(ns("purge", "screenshot"), {
      score: Date.now(),
      member: "ut-key-s1",
    });
    await redis.zadd(ns("purge", "social"), {
      score: Date.now(),
      member: "ut-key-so1",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    utMock.deleteFiles.mockClear();
  });

  it("prunes due keys using pruneDueBlobsOnce", async () => {
    const { pruneDueBlobsOnce } = await import("./blob-prune");
    const { deleted, errors } = await pruneDueBlobsOnce(Date.now());
    expect(deleted.length).toBeGreaterThan(0);
    expect(errors.length).toBe(0);
    // ensure removed from zset (no due members remain)
    const { redis, ns } = await import("@/lib/redis");
    const due = await redis.zrange(ns("purge", "favicon"), 0, Date.now(), {
      byScore: true,
    });
    expect(due.length).toBe(0);
  });
});
