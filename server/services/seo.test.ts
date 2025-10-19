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

beforeAll(async () => {
  const { makePGliteDb } = await import("@/server/db/pglite");
  const { db } = await makePGliteDb();
  vi.doMock("@/server/db/client", () => ({ db }));
  const { makeInMemoryRedis } = await import("@/lib/redis-mock");
  const impl = makeInMemoryRedis();
  vi.doMock("@/lib/redis", () => impl);
});

beforeEach(async () => {
  const { resetPGliteDb } = await import("@/server/db/pglite");
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
    const { upsertDomain } = await import("@/server/repos/domains");
    const { upsertSeo } = await import("@/server/repos/seo");
    const { ttlForSeo } = await import("@/server/db/ttl");

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
      previewImageUploadedUrl: null,
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

    const out = await getSeo("nonhtml.invalid");
    expect(out.errors?.html).toMatch(/Non-HTML content-type/i);
    fetchMock.mockRestore();
  });

  it("sets robots error when robots.txt non-text content-type", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(htmlResponse("<html></html>", "https://x/"))
      .mockResolvedValueOnce(textResponse("{}", "application/json"));

    const out = await getSeo("robots-content.invalid");
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

    const out = await getSeo("img-fail.invalid");
    // original image remains for Meta Tags display
    expect(out.preview?.image ?? "").toContain("/og.png");
    // uploaded url is null on failure for privacy-safe rendering
    expect(out.preview?.imageUploaded ?? null).toBeNull();
    fetchMock.mockRestore();
  });
});
