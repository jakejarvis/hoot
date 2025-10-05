/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/blob", () => ({
  del: vi.fn(async (_url: string) => undefined),
}));

// Use global redis mock; seed with URLs instead of pathnames
beforeEach(() => {
  global.__redisTestHelper.reset();
  const set = global.__redisTestHelper.zsets;
  set.set("purge:favicon", new Map([["https://blob/f1", Date.now()]]));
  set.set("purge:screenshot", new Map([["https://blob/s1", Date.now()]]));
});

import { GET } from "./route";

describe("/api/cron/blob-prune", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
