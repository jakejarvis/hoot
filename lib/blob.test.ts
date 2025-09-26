/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/blob", () => ({
  head: vi.fn(async (_path: string) => ({ url: "https://blob/url.png" })),
  put: vi.fn(async (_path: string, _buf: unknown, _opts: unknown) => ({
    url: "https://blob/put.png",
  })),
}));

import {
  computeFaviconBlobPath,
  computeScreenshotBlobPath,
  getScreenshotBucket,
  headFaviconBlob,
  headScreenshotBlob,
  putFaviconBlob,
} from "./blob";

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("blob utils", () => {
  it("computeFaviconBlobPath is deterministic and secret-dependent", () => {
    process.env.BLOB_SIGNING_SECRET = "secret-a";
    const a1 = computeFaviconBlobPath("example.com", 32);
    const a2 = computeFaviconBlobPath("example.com", 32);
    expect(a1).toBe(a2);
    // Different size yields different path
    const a3 = computeFaviconBlobPath("example.com", 64);
    expect(a3).not.toBe(a1);

    process.env.BLOB_SIGNING_SECRET = "secret-b";
    const b1 = computeFaviconBlobPath("example.com", 32);
    expect(b1).not.toBe(a1);
    expect(a1).toMatch(/^favicons\//);
  });

  it("paths include bucket segments and change when bucket changes", () => {
    process.env.FAVICON_TTL_SECONDS = "10";
    process.env.SCREENSHOT_TTL_SECONDS = "10";
    const base = 1_000_000_000_000;
    const realNow = Date.now;

    Date.now = () => base;
    const f1 = computeFaviconBlobPath("example.com", 32);
    const s1 = computeScreenshotBlobPath("example.com", 1200, 630);

    Date.now = () => base + 11_000;
    const f2 = computeFaviconBlobPath("example.com", 32);
    const s2 = computeScreenshotBlobPath("example.com", 1200, 630);
    expect(f1).not.toBe(f2);
    expect(s1).not.toBe(s2);
    Date.now = realNow;
  });

  it("headFaviconBlob returns URL on success and null when both buckets miss", async () => {
    const { head } = await import("@vercel/blob");
    (head as unknown as import("vitest").Mock).mockResolvedValueOnce({
      url: "https://blob/existing.png",
    });
    const url = await headFaviconBlob("example.com", 32);
    expect(url).toBe("https://blob/existing.png");
    (head as unknown as import("vitest").Mock).mockRejectedValueOnce(
      new Error("fail-current"),
    );
    (head as unknown as import("vitest").Mock).mockRejectedValueOnce(
      new Error("fail-prev"),
    );
    const none = await headFaviconBlob("example.com", 32);
    expect(none).toBeNull();
  });

  it("putFaviconBlob uploads with expected options and returns URL", async () => {
    const { put } = await import("@vercel/blob");
    const url = await putFaviconBlob("example.com", 32, Buffer.from([1]));
    expect(url).toBe("https://blob/put.png");
    expect(
      (put as unknown as import("vitest").Mock).mock.calls[0]?.[2],
    ).toMatchObject({
      access: "public",
      contentType: "image/png",
    });
  });

  it("headScreenshotBlob falls back to previous bucket on miss", async () => {
    process.env.SCREENSHOT_TTL_SECONDS = "10";
    const base = 1_000_000_000_000;
    const realNow = Date.now;
    Date.now = () => base;
    void getScreenshotBucket();
    Date.now = () => base + 1_000;

    const { head } = await import("@vercel/blob");
    (head as unknown as import("vitest").Mock).mockRejectedValueOnce(
      new Error("current missing"),
    );
    (head as unknown as import("vitest").Mock).mockResolvedValueOnce({
      url: "https://blob/fallback.png",
    });
    const url = await headScreenshotBlob("example.com", 1200, 630);
    expect(url).toBe("https://blob/fallback.png");
    Date.now = realNow;
  });
});
