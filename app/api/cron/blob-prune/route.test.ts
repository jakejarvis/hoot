/* @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage", () => {
  const adapter = {
    uploadPublicPng: vi.fn(),
    deleteByKeys: vi.fn(async () => undefined),
    getUrls: vi.fn(),
  };
  return {
    getStorageAdapter: () => adapter,
  };
});

import { cacheSet, ns } from "@/lib/redis";
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

    // Seed Redis bucket sets and index keys
    const favSet = ns("icon:bucket", "1");
    const ssSet = ns("screenshot:bucket", "1");
    const entries = [
      {
        providerKey: "favicons/1/abc/32.png",
        indexKey: ns("icon:index", "1:abc:32"),
      },
      {
        providerKey: "screenshots/1/ghi/1200x630.png",
        indexKey: ns("screenshot:index", "1:ghi:1200x630"),
      },
    ];
    await cacheSet(favSet, [entries[0]], 60);
    await cacheSet(ssSet, [entries[1]], 60);
    await cacheSet(
      entries[0].indexKey,
      { providerKey: entries[0].providerKey, url: "https://ufs/icon" },
      60,
    );
    await cacheSet(
      entries[1].indexKey,
      { providerKey: entries[1].providerKey, url: "https://ufs/screenshot" },
      60,
    );

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
