/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const s3Send = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: s3Send })),
  DeleteObjectsCommand: vi.fn().mockImplementation((input) => ({ input })),
}));
vi.stubEnv("R2_ACCOUNT_ID", "test-account");
vi.stubEnv("R2_ACCESS_KEY_ID", "akid");
vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
vi.stubEnv("R2_BUCKET", "test-bucket");

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
    s3Send.mockClear();
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
