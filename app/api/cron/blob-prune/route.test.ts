/* @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/blob", () => ({
  list: vi.fn(async (_opts: unknown) => ({
    blobs: [
      { pathname: "favicons/1/abc/32.png", url: "https://blob/f1" },
      { pathname: "favicons/999999/def/32.png", url: "https://blob/f2" },
      { pathname: "screenshots/1/ghi/1200x630.png", url: "https://blob/s1" },
    ],
    cursor: undefined,
  })),
  del: vi.fn(async (_url: string) => undefined),
}));

import { GET } from "./route";

describe("/api/cron/blob-prune", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires secret and prunes old buckets (GET)", async () => {
    process.env.CRON_SECRET = "test-secret";
    // Force nowBucket to be large so bucket=1 items are considered old
    const realNow = Date.now;
    Date.now = () => 10_000_000_000_000;

    const req = new Request("http://localhost/api/cron/blob-prune", {
      method: "GET",
      headers: { authorization: "Bearer test-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.deletedCount).toBeGreaterThan(0);

    // restore
    Date.now = realNow;
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
