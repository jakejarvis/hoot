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
  headFaviconBlob,
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
    process.env.FAVICON_BLOB_SIGNING_SECRET = "secret-a";
    const a1 = computeFaviconBlobPath("example.com", 32);
    const a2 = computeFaviconBlobPath("example.com", 32);
    expect(a1).toBe(a2);
    // Different size yields different path
    const a3 = computeFaviconBlobPath("example.com", 64);
    expect(a3).not.toBe(a1);

    process.env.FAVICON_BLOB_SIGNING_SECRET = "secret-b";
    const b1 = computeFaviconBlobPath("example.com", 32);
    expect(b1).not.toBe(a1);
    expect(a1).toMatch(/^favicons\//);
  });

  it("headFaviconBlob returns URL on success and null on error", async () => {
    const { head } = await import("@vercel/blob");
    (head as unknown as import("vitest").Mock).mockResolvedValueOnce({
      url: "https://blob/existing.png",
    });
    const url = await headFaviconBlob("example.com", 32);
    expect(url).toBe("https://blob/existing.png");

    (head as unknown as import("vitest").Mock).mockRejectedValueOnce(
      new Error("fail"),
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
});
