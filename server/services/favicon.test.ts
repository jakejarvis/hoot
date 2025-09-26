/* @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";

const blobMock = vi.hoisted(() => ({
  headFaviconBlob: vi.fn(),
  putFaviconBlob: vi.fn(async () => "blob://stored-url"),
}));

vi.mock("@/lib/blob", () => blobMock);

// Mock sharp to return a pipeline that resolves a buffer
vi.mock("sharp", () => ({
  default: (_input: unknown, _opts?: unknown) => ({
    resize: () => ({
      png: () => ({
        toBuffer: async () => Buffer.from([1, 2, 3]),
      }),
    }),
  }),
}));

// Import after mocks
import { getOrCreateFaviconBlobUrl } from "./favicon";

afterEach(() => {
  vi.restoreAllMocks();
  blobMock.headFaviconBlob.mockReset();
  blobMock.putFaviconBlob.mockReset();
});

describe("getOrCreateFaviconBlobUrl", () => {
  it("returns existing blob url when present", async () => {
    blobMock.headFaviconBlob.mockResolvedValueOnce("blob://existing-url");
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(null, { status: 404 }));
    const out = await getOrCreateFaviconBlobUrl("example.com");
    expect(out.url).toBe("blob://existing-url");
    // Should not store anew
    expect(blobMock.putFaviconBlob).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("fetches, converts, stores, and returns url when not cached", async () => {
    blobMock.headFaviconBlob.mockResolvedValueOnce(null);
    const body = new Uint8Array([137, 80, 78, 71]); // pretend PNG signature bytes
    const resp = new Response(body, {
      status: 200,
      headers: { "content-type": "image/png" },
    });
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(resp);

    const out = await getOrCreateFaviconBlobUrl("example.com");
    expect(out.url).toBe("blob://stored-url");
    expect(blobMock.putFaviconBlob).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("returns null when all sources fail", async () => {
    blobMock.headFaviconBlob.mockResolvedValueOnce(null);
    const notOk = new Response(null, { status: 404 });
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(notOk);
    const out = await getOrCreateFaviconBlobUrl("nope.invalid");
    expect(out.url).toBeNull();
    fetchSpy.mockRestore();
  });
});
