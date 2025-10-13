/* @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

beforeEach(() => {
  globalThis.__redisTestHelper.reset();
});

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.__redisTestHelper.reset();
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
    const { ns, redis } = await import("@/lib/redis");
    const metaKey = ns("seo", "example.com", "meta");
    await redis.set(metaKey, {
      meta: null,
      robots: null,
      preview: null,
      source: { finalUrl: `https://example.com/`, status: 200 },
    });

    const fetchSpy = vi.spyOn(global, "fetch");
    const out = await getSeo("example.com");
    expect(out).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
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

    const out = await getSeo("example.com");
    expect(out.meta).toBeNull();
    expect(out.errors?.html).toMatch(/Non-HTML content-type/i);
    fetchMock.mockRestore();
  });

  it("sets robots error when robots.txt non-text content-type", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(htmlResponse("<html></html>", "https://x/"))
      .mockResolvedValueOnce(textResponse("{}", "application/json"));

    const out = await getSeo("example.com");
    expect(out.errors?.robots).toMatch(/Unexpected robots content-type/i);
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

    const out = await getSeo("example.com");
    // original image remains for Meta Tags display
    expect(out.preview?.image).toBe("https://example.com/og.png");
    // uploaded url is null on failure for privacy-safe rendering
    expect(out.preview?.imageUploaded ?? null).toBeNull();
    fetchMock.mockRestore();
  });

  it("uses cached robots when present and avoids second fetch", async () => {
    const { ns, redis } = await import("@/lib/redis");
    const robotsKey = ns("seo", "example.com", "robots");
    await redis.set(robotsKey, {
      fetched: true,
      groups: [{ userAgents: ["*"], rules: [{ type: "allow", value: "/" }] }],
      sitemaps: [],
    });

    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        htmlResponse(
          "<html><head><title>x</title></head></html>",
          "https://example.com/",
        ),
      );

    await getSeo("example.com");
    // Only HTML fetch should have occurred
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockRestore();
  });
});
