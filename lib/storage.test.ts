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
  it("uploadImage (favicon) returns ufsUrl and UT file key and calls UTApi", async () => {
    const res = await uploadImage({
      kind: "favicon",
      domain: "example.com",
      width: 32,
      height: 32,
      png: Buffer.from([1, 2, 3]),
    });
    expect(res.url).toBe("https://app.ufs.sh/f/mock-key");
    // we return UploadThing file key for deletion
    expect(res.key).toBe("mock-key");
    const callArg = (utMock.uploadFiles as unknown as import("vitest").Mock)
      .mock.calls[0]?.[0];
    expect(callArg).toBeInstanceOf(Blob);
    expect(utMock.uploadFiles).toHaveBeenCalledTimes(1);
  });

  it("uploadImage (screenshot) returns ufsUrl and UT file key and calls UTApi", async () => {
    const res = await uploadImage({
      kind: "screenshot",
      domain: "example.com",
      width: 1200,
      height: 630,
      png: Buffer.from([4, 5, 6]),
    });
    expect(res.url).toBe("https://app.ufs.sh/f/mock-key");
    // we return UploadThing file key for deletion
    expect(res.key).toBe("mock-key");
    const callArg = (utMock.uploadFiles as unknown as import("vitest").Mock)
      .mock.calls[0]?.[0];
    expect(callArg).toBeInstanceOf(Blob);
    expect(utMock.uploadFiles).toHaveBeenCalledTimes(1);
  });

  it("retries on upload failure and succeeds on second attempt", async () => {
    utMock.uploadFiles
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        data: { ufsUrl: "https://app.ufs.sh/f/retry-key", key: "retry-key" },
        error: null,
      });

    const res = await uploadImage({
      kind: "favicon",
      domain: "retry.com",
      width: 32,
      height: 32,
      png: Buffer.from([1, 2, 3]),
    });

    expect(res.url).toBe("https://app.ufs.sh/f/retry-key");
    expect(res.key).toBe("retry-key");
    expect(utMock.uploadFiles).toHaveBeenCalledTimes(2);
  });

  it("retries on missing url in response", async () => {
    utMock.uploadFiles
      .mockResolvedValueOnce({
        data: { key: "no-url", ufsUrl: undefined } as never,
        error: null,
      })
      .mockResolvedValueOnce({
        data: { ufsUrl: "https://app.ufs.sh/f/retry-key", key: "retry-key" },
        error: null,
      });

    const res = await uploadImage({
      kind: "favicon",
      domain: "retry.com",
      width: 32,
      height: 32,
      png: Buffer.from([1, 2, 3]),
    });

    expect(res.url).toBe("https://app.ufs.sh/f/retry-key");
    expect(utMock.uploadFiles).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting all retry attempts", async () => {
    utMock.uploadFiles.mockRejectedValue(new Error("Persistent error"));

    await expect(
      uploadImage({
        kind: "favicon",
        domain: "fail.com",
        width: 32,
        height: 32,
        png: Buffer.from([1, 2, 3]),
      }),
    ).rejects.toThrow(/Upload failed after 3 attempts/);

    expect(utMock.uploadFiles).toHaveBeenCalledTimes(3);
  });

  it("handles error in UploadThing response", async () => {
    utMock.uploadFiles
      .mockResolvedValueOnce({
        data: null as never,
        error: new Error("UploadThing API error") as never,
      })
      .mockResolvedValueOnce({
        data: { ufsUrl: "https://app.ufs.sh/f/ok", key: "ok" },
        error: null,
      });

    const res = await uploadImage({
      kind: "favicon",
      domain: "error.com",
      width: 32,
      height: 32,
      png: Buffer.from([1, 2, 3]),
    });

    expect(res.url).toBe("https://app.ufs.sh/f/ok");
    expect(utMock.uploadFiles).toHaveBeenCalledTimes(2);
  });
});
