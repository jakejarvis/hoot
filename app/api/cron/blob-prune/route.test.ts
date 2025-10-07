/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const utMock = vi.hoisted(() => ({
  deleteFiles: vi.fn(async (_keys: string[]) => undefined),
}));
vi.mock("uploadthing/server", () => ({
  UTApi: vi.fn().mockImplementation(() => utMock),
}));

// Use global redis mock; seed with URLs instead of pathnames
beforeEach(() => {
  global.__redisTestHelper.reset();
  const set = global.__redisTestHelper.zsets;
  set.set("purge:favicon", new Map([["ut-key-f1", Date.now()]]));
  set.set("purge:screenshot", new Map([["ut-key-s1", Date.now()]]));
  set.set("purge:social", new Map([["ut-key-so1", Date.now()]]));
});

import { GET } from "./route";

describe("/api/cron/blob-prune", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    utMock.deleteFiles.mockClear();
  });

  it("requires secret and prunes old buckets (GET)", async () => {
    process.env.CRON_SECRET = "test-secret";

    const req = new Request("http://localhost/api/cron/blob-prune", {
      method: "GET",
      headers: { authorization: "Bearer test-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deletedCount).toBeGreaterThan(0);
  });

  it("rejects when secret missing or invalid (GET)", async () => {
    delete process.env.CRON_SECRET;
    const req = new Request("http://localhost/api/cron/blob-prune", {
      method: "GET",
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
