/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const blobMock = vi.hoisted(() => ({
  headScreenshotBlob: vi.fn(),
  putScreenshotBlob: vi.fn(async () => "blob://stored-screenshot"),
}));

vi.mock("@/lib/blob", () => blobMock);

// Mock puppeteer environments
const pageMock = {
  setViewport: vi.fn(async () => undefined),
  setUserAgent: vi.fn(async () => undefined),
  goto: vi.fn(async () => undefined),
  screenshot: vi.fn(async () => Buffer.from([1, 2, 3])),
};
const browserMock = {
  newPage: vi.fn(async () => pageMock),
  close: vi.fn(async () => undefined),
};

vi.mock("puppeteer", () => ({
  launch: vi.fn(async () => browserMock),
}));
vi.mock("puppeteer-core", () => ({
  launch: vi.fn(async () => browserMock),
}));

// Optimize does a simple pass-through for test speed
vi.mock("@/lib/image", () => ({
  optimizePngCover: vi.fn(async (b: Buffer) => b),
}));

import { getOrCreateScreenshotBlobUrl } from "./screenshot";

beforeEach(() => {
  process.env.VERCEL_ENV = ""; // force local puppeteer path in tests
});

afterEach(() => {
  vi.restoreAllMocks();
  blobMock.headScreenshotBlob.mockReset();
  blobMock.putScreenshotBlob.mockReset();
});

describe("getOrCreateScreenshotBlobUrl", () => {
  it("returns existing blob url when present", async () => {
    blobMock.headScreenshotBlob.mockResolvedValueOnce("blob://existing");
    const out = await getOrCreateScreenshotBlobUrl("example.com");
    expect(out.url).toBe("blob://existing");
    expect(blobMock.putScreenshotBlob).not.toHaveBeenCalled();
  });

  it("captures, uploads and returns url when not cached", async () => {
    blobMock.headScreenshotBlob.mockResolvedValueOnce(null);
    const out = await getOrCreateScreenshotBlobUrl("example.com");
    expect(out.url).toBe("blob://stored-screenshot");
    expect(blobMock.putScreenshotBlob).toHaveBeenCalled();
  });
});
