/* @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/blob", () => ({
  del: vi.fn(async (_url: string) => undefined),
}));

const redisMock = vi.hoisted(() => ({
  redis: {
    // Store members as an array representing due items
    _due: ["favicons/abc/32.png", "screenshots/ghi/1200x630.png"],
    zrange: vi.fn(
      async (_key: string, _min: number, _max: number, _opts: unknown) => {
        // return and drain up to 500
        const out = redisMock.redis._due.splice(0, 500);
        return out;
      },
    ),
    zrem: vi.fn(async (_key: string, ..._members: string[]) => _members.length),
  },
  ns: (n: string, id: string) => `${n}:${id}`,
}));

vi.mock("@/lib/redis", () => redisMock);

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
