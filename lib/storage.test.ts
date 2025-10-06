/* @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";

const utMock = vi.hoisted(() => ({
  uploadFiles: vi.fn(async () => ({
    data: { ufsUrl: "https://app.ufs.sh/f/mock-key", key: "mock-key" },
    error: null,
  })),
}));

vi.mock("uploadthing/server", () => ({
  UTApi: vi.fn().mockImplementation(() => utMock),
}));

import { uploadFavicon, uploadScreenshot } from "./storage";

afterEach(() => {
  vi.restoreAllMocks();
  utMock.uploadFiles.mockClear();
});

describe("storage uploads", () => {
  it("uploadFavicon returns ufsUrl and key and calls UTApi", async () => {
    const res = await uploadFavicon({
      domain: "example.com",
      size: 32,
      png: Buffer.from([1, 2, 3]),
    });
    expect(res.url).toBe("https://app.ufs.sh/f/mock-key");
    expect(res.key).toBe("mock-key");
    const callArg = (utMock.uploadFiles as unknown as import("vitest").Mock)
      .mock.calls[0]?.[0];
    expect(callArg).toBeInstanceOf(File);
  });

  it("uploadScreenshot returns ufsUrl and key and calls UTApi", async () => {
    const res = await uploadScreenshot({
      domain: "example.com",
      width: 1200,
      height: 630,
      png: Buffer.from([4, 5, 6]),
    });
    expect(res.url).toBe("https://app.ufs.sh/f/mock-key");
    expect(res.key).toBe("mock-key");
    const callArg = (
      utMock.uploadFiles as unknown as import("vitest").Mock
    ).mock.calls.pop()?.[0];
    expect(callArg).toBeInstanceOf(File);
  });
});
