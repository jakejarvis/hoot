/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage", () => {
  const adapter = {
    uploadPublicPng: vi.fn(async ({ fileKey }: { fileKey: string }) => ({
      url: `https://ufs.example/f/${fileKey}`,
      key: fileKey,
    })),
    deleteByKeys: vi.fn(async () => undefined),
    getUrls: vi.fn(async (keys: string[]) => {
      const map = new Map<string, string>();
      for (const k of keys) map.set(k, `https://ufs.example/f/${k}`);
      return map;
    }),
  };
  return {
    getStorageAdapter: () => adapter,
  };
});

vi.mock("@/lib/redis", () => {
  const store = new Map<string, unknown>();
  return {
    ns: (n: string, id: string) => `${n}:${id}`,
    cacheGet: vi.fn(async (key: string) =>
      store.has(key) ? store.get(key) : null,
    ),
    cacheSet: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    cacheDel: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    tryAcquireLock: vi.fn(async () => true),
    releaseLock: vi.fn(async () => undefined),
  };
});

import {
  getFaviconBucket,
  getScreenshotBucket,
  headFaviconBlob,
  headScreenshotBlob,
  putFaviconBlob,
  putScreenshotBlob,
} from "./blob";

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("blob utils", () => {
  it("favicon customId is deterministic and secret-dependent", async () => {
    process.env.BLOB_SIGNING_SECRET = "secret-a";
    const a1 = await putFaviconBlob("example.com", 32, Buffer.from([1]));
    const a2 = await putFaviconBlob("example.com", 32, Buffer.from([1]));
    expect(a1).toBe(a2);

    process.env.BLOB_SIGNING_SECRET = "secret-b";
    const b1 = await putFaviconBlob("example.com", 32, Buffer.from([1]));
    expect(b1).not.toBe(a1);
    expect(a1).toMatch(/https:\/\/ufs\.example\/f\/icon-/);
  });

  it("screenshot customId is deterministic and secret-dependent", async () => {
    process.env.BLOB_SIGNING_SECRET = "secret-a";
    const s1 = await putScreenshotBlob(
      "example.com",
      1200,
      630,
      Buffer.from([1]),
    );
    const s2 = await putScreenshotBlob(
      "example.com",
      1200,
      630,
      Buffer.from([1]),
    );
    expect(s1).toBe(s2);

    process.env.BLOB_SIGNING_SECRET = "secret-b";
    const s3 = await putScreenshotBlob(
      "example.com",
      1200,
      630,
      Buffer.from([1]),
    );
    expect(s3).not.toBe(s1);
    expect(s1).toMatch(/https:\/\/ufs\.example\/f\/screenshot-/);
  });

  it("customIds include bucket number and rotate when the bucket changes", async () => {
    process.env.FAVICON_TTL_SECONDS = "10";
    process.env.SCREENSHOT_TTL_SECONDS = "10";
    const base = 1_000_000_000_000;
    const realNow = Date.now;

    Date.now = () => base;
    const b1 = getFaviconBucket();
    const f1 = await putFaviconBlob("example.com", 32, Buffer.from([1]));
    expect(f1).toMatch(new RegExp(`-${b1}-`));

    Date.now = () => base + 11_000;
    const b2 = getFaviconBucket();
    const f2 = await putFaviconBlob("example.com", 32, Buffer.from([1]));
    expect(b2).not.toBe(b1);
    expect(f2).toMatch(new RegExp(`-${b2}-`));
    expect(f1).not.toBe(f2);
    Date.now = realNow;
  });

  it("headFaviconBlob returns URL from index and null on miss", async () => {
    // First call should be a miss since no cache yet
    const none = await headFaviconBlob("example.com", 32);
    expect(none).toBeNull();
    // After put, head should hit
    const putUrl = await putFaviconBlob("example.com", 32, Buffer.from([1]));
    expect(putUrl).toMatch(/^https:\/\/ufs\.example\/f\//);
    const url = await headFaviconBlob("example.com", 32);
    expect(url).toBe(putUrl);
  });

  it("putFaviconBlob uploads and stores index", async () => {
    const url = await putFaviconBlob("example.com", 32, Buffer.from([1]));
    expect(url).toMatch(/icon-/);
  });

  it("putScreenshotBlob uploads and stores index", async () => {
    process.env.SCREENSHOT_TTL_SECONDS = "10";
    const url = await putScreenshotBlob(
      "example.com",
      1200,
      630,
      Buffer.from([1]),
    );
    expect(url).toMatch(/screenshot-/);
  });

  it("headScreenshotBlob falls back to previous bucket on miss", async () => {
    process.env.SCREENSHOT_TTL_SECONDS = "10";
    const base = 1_000_000_000_000;
    const realNow = Date.now;
    Date.now = () => base;
    void getScreenshotBucket();
    Date.now = () => base + 1_000;

    // Put into previous bucket by using old timestamp, then advance time.
    Date.now = () => base;
    await putScreenshotBlob("example.com", 1200, 630, Buffer.from([1]));
    Date.now = () => base + 1_000;
    const url = await headScreenshotBlob("example.com", 1200, 630);
    expect(url).toMatch(/screenshot-/);
    Date.now = realNow;
  });

  it("headScreenshotBlob returns URL on success and null when both buckets miss", async () => {
    const url = await putScreenshotBlob(
      "example.com",
      1200,
      630,
      Buffer.from([1]),
    );
    expect(await headScreenshotBlob("example.com", 1200, 630)).toBe(url);
    // Change domain so lookup misses
    expect(await headScreenshotBlob("other.com", 1200, 630)).toBeNull();
  });
});
