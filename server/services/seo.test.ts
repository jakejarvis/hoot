/* @vitest-environment node */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// getSeo is imported dynamically after mocks are applied
let getSeo: typeof import("./seo").getSeo;

const blobPutMock = vi.hoisted(() =>
  vi.fn(async (pathname: string) => ({
    url: `https://test-store.public.blob.vercel-storage.com/${pathname}`,
    downloadUrl: `https://test-store.public.blob.vercel-storage.com/${pathname}?download=1`,
    contentType: "image/webp",
  })),
);

vi.mock("@vercel/blob", () => ({
  put: blobPutMock,
}));

vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");

beforeAll(async () => {
  const { makePGliteDb } = await import("@/lib/db/pglite");
  const { db } = await makePGliteDb();
  vi.doMock("@/lib/db/client", () => ({ db }));
  const { makeInMemoryRedis } = await import("@/lib/redis-mock");
  const impl = makeInMemoryRedis();
  vi.doMock("@/lib/redis", () => impl);
});

beforeEach(async () => {
  const { resetPGliteDb } = await import("@/lib/db/pglite");
  await resetPGliteDb();
  const { resetInMemoryRedis } = await import("@/lib/redis-mock");
  resetInMemoryRedis();
});

afterEach(async () => {
  vi.restoreAllMocks();
  const { resetInMemoryRedis } = await import("@/lib/redis-mock");
  resetInMemoryRedis();
});

// Ensure module under test is loaded after mocks
beforeEach(async () => {
  ({ getSeo } = await import("./seo"));
});

function htmlResponse(html: string, url: string) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
    text: async () => html,
    url,
  } as unknown as Response;
}

function textResponse(text: string, contentType = "text/plain") {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": contentType }),
    text: async () => text,
    url: "",
  } as unknown as Response;
}

// imageResponse helper removed along with flaky test

describe("getSeo", () => {
  it("uses cached response when meta exists in cache", async () => {
    const { upsertDomain } = await import("@/lib/db/repos/domains");
    const { upsertSeo } = await import("@/lib/db/repos/seo");
    const { ttlForSeo } = await import("@/lib/db/ttl");

    const now = new Date();
    const d = await upsertDomain({
      name: "example.com",
      tld: "com",
      unicodeName: "example.com",
    });
    await upsertSeo({
      domainId: d.id,
      sourceFinalUrl: "https://example.com/",
      sourceStatus: 200,
      metaOpenGraph: {},
      metaTwitter: {},
      metaGeneral: {},
      previewTitle: null,
      previewDescription: null,
      previewImageUrl: null,
      canonicalUrl: null,
      robots: { fetched: true, groups: [], sitemaps: [] },
      robotsSitemaps: [],
      errors: {},
      fetchedAt: now,
      expiresAt: ttlForSeo(now),
    });

    const out = await getSeo("example.com");
    expect(out).toBeTruthy();
  });

  it("sets html error when non-HTML content-type returned", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => "{}",
        url: "https://example.com/",
      } as unknown as Response)
      .mockResolvedValueOnce(textResponse("", "text/plain"));

    const out = await getSeo("nonhtml.com");
    expect(out.errors?.html).toMatch(/Non-HTML content-type/i);
    fetchMock.mockRestore();
  });

  it("sets robots error when robots.txt non-text content-type", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(htmlResponse("<html></html>", "https://x/"))
      .mockResolvedValueOnce(textResponse("{}", "application/json"));

    const out = await getSeo("robots-content.com");
    expect(out.errors?.robots ?? "").toMatch(/Unexpected robots content-type/i);
    fetchMock.mockRestore();
  });

  it("sets preview.imageUploaded to null when image fetch fails and preserves original", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        htmlResponse(
          `<!doctype html><html><head>
            <title>Site</title>
            <meta property="og:image" content="/og.png" />
          </head></html>`,
          "https://example.com/",
        ),
      )
      .mockResolvedValueOnce(
        textResponse("User-agent: *\nAllow: /", "text/plain"),
      )
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ "content-type": "text/plain" }),
        arrayBuffer: async () => new ArrayBuffer(0),
        url: "",
      } as unknown as Response);

    const out = await getSeo("img-fail.com");
    // original image remains for Meta Tags display
    expect(out.preview?.image ?? "").toContain("/og.png");
    // uploaded url is null on failure for privacy-safe rendering
    expect(out.preview?.imageUploaded ?? null).toBeNull();
    fetchMock.mockRestore();
  });
});
