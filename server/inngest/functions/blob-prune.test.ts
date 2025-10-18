/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const utMock = vi.hoisted(() => ({
  deleteFiles: vi.fn(async (_keys: string[]) => undefined),
}));
vi.mock("uploadthing/server", () => ({
  UTApi: vi.fn().mockImplementation(() => utMock),
}));

describe("blob-prune Inngest function", () => {
  beforeEach(() => {
    global.__redisTestHelper.reset();
    const set = global.__redisTestHelper.zsets;
    set.set("purge:favicon", new Map([["ut-key-f1", Date.now()]]));
    set.set("purge:screenshot", new Map([["ut-key-s1", Date.now()]]));
    set.set("purge:social", new Map([["ut-key-so1", Date.now()]]));
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
    // ensure removed from zsets
    expect(global.__redisTestHelper.zsets.get("purge:favicon")?.size).toBe(0);
  });
});
