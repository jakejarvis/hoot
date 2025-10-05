/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/blob", () => ({
  put: vi.fn(async (_path: string, _buf: unknown, _opts: unknown) => ({
    url: "https://blob/put.png",
  })),
}));

import {
  computeFaviconBlobPath,
  computeScreenshotBlobPath,
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

  it("computeScreenshotBlobPath is deterministic and secret-dependent", () => {
    process.env.BLOB_SIGNING_SECRET = "secret-a";
    const s1 = computeScreenshotBlobPath("example.com", 1200, 630);
    const s2 = computeScreenshotBlobPath("example.com", 1200, 630);
    expect(s1).toBe(s2);

    process.env.BLOB_SIGNING_SECRET = "secret-b";
    const s3 = computeScreenshotBlobPath("example.com", 1200, 630);
    expect(s3).not.toBe(s1);
    expect(s1).toMatch(/^screenshots\//);
  });

  it("stable paths do not change over time", () => {
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
    expect(f1).toBe(f2);
    expect(s1).toBe(s2);
    Date.now = realNow;
  });

  // head* helpers removed in favor of Redis index; put* still tested

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

  it("putScreenshotBlob uploads with expected options and returns URL", async () => {
    process.env.SCREENSHOT_TTL_SECONDS = "10";
    const { put } = await import("@vercel/blob");
    (put as unknown as import("vitest").Mock).mockClear();
    const url = await putScreenshotBlob(
      "example.com",
      1200,
      630,
      Buffer.from([1]),
    );
    expect(url).toBe("https://blob/put.png");
    const calls = (put as unknown as import("vitest").Mock).mock.calls;
    const call = calls[calls.length - 1];
    expect(call?.[0]).toMatch(/^screenshots\//);
    expect(call?.[0]).toMatch(/\/1200x630\.png$/);
    expect(call?.[2]).toMatchObject({
      access: "public",
      contentType: "image/png",
    });
  });

  // head* helpers removed in favor of Redis index
});
