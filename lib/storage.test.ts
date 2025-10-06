/* @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";

const utMock = vi.hoisted(() => ({
  uploadFiles: vi.fn(async () => ({
    data: { ufsUrl: "https://app.ufs.sh/f/mock-key", key: "mock-key" },
    error: null,
  })),
}));

vi.mock("uploadthing/server", async () => {
  const actual =
    await vi.importActual<typeof import("uploadthing/server")>(
      "uploadthing/server",
    );
  return {
    ...actual,
    UTApi: vi.fn().mockImplementation(() => utMock),
  };
});

import { uploadImage } from "./storage";

afterEach(() => {
  vi.restoreAllMocks();
  utMock.uploadFiles.mockClear();
});

describe("storage uploads", () => {
  it("uploadImage (favicon) returns ufsUrl and key and calls UTApi", async () => {
    const res = await uploadImage({
      kind: "favicon",
      domain: "example.com",
      width: 32,
      height: 32,
      png: Buffer.from([1, 2, 3]),
    });
    expect(res.url).toBe("https://app.ufs.sh/f/mock-key");
    // we now return customId as key (for deletion by customId)
    expect(res.key).toBe("favicon_example-com_32x32.png");
    const callArg = (utMock.uploadFiles as unknown as import("vitest").Mock)
      .mock.calls[0]?.[0];
    expect(callArg).toBeInstanceOf(Blob);
  });

  it("uploadImage (screenshot) returns ufsUrl and key and calls UTApi", async () => {
    const res = await uploadImage({
      kind: "screenshot",
      domain: "example.com",
      width: 1200,
      height: 630,
      png: Buffer.from([4, 5, 6]),
    });
    expect(res.url).toBe("https://app.ufs.sh/f/mock-key");
    // we now return customId as key (for deletion by customId)
    expect(res.key).toBe("screenshot_example-com_1200x630.png");
    const callArg = (utMock.uploadFiles as unknown as import("vitest").Mock)
      .mock.calls[0]?.[0];
    expect(callArg).toBeInstanceOf(Blob);
  });
});
