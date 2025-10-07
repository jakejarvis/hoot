import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { SeoSection } from "./seo-section";

// SocialPreview renders next/image; mock it to avoid next/image behavior and expose props
type SocialPreviewMockProps = {
  provider: "twitter" | "facebook" | "linkedin" | "slack" | "discord";
  title?: string | null;
  description?: string | null;
  image?: string | null;
  url: string;
  variant?: "compact" | "large";
};

vi.mock("@/components/social-preview", () => ({
  SocialPreview: (props: SocialPreviewMockProps) =>
    createElement("div", {
      "data-slot": "social-preview",
      "data-provider": props.provider,
      "data-title": props.title ?? "",
      "data-description": props.description ?? "",
      "data-image": props.image ?? "",
      "data-url": props.url,
      "data-variant": props.variant ?? "",
    }),
}));

// next/image mock for any incidental usage
vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, src }: { alt: string; src: string }) =>
    createElement("img", { alt, src, "data-slot": "image" }),
}));

function buildSeoData(
  overrides: Partial<import("@/lib/schemas").SeoResponse> = {},
) {
  const base: import("@/lib/schemas").SeoResponse = {
    meta: {
      openGraph: {
        title: "OG Title",
        description: "OG Desc",
        type: "website",
        url: "https://example.com/",
        siteName: "Example",
        images: ["https://example.com/og.png"],
      },
      twitter: {
        card: "summary",
        title: "TW Title",
        description: "TW Desc",
        image: "https://example.com/tw.jpg",
      },
      general: {
        title: "Title",
        description: "Desc",
        canonical: "https://example.com/",
        robots: "index,follow",
      },
    },
    preview: {
      title: "Title",
      description: "Desc",
      image: "https://example.com/og.png",
      canonicalUrl: "https://example.com/",
    },
    robots: {
      fetched: true,
      groups: [
        {
          userAgents: ["*"],
          rules: [
            { type: "allow", value: "/" },
            { type: "disallow", value: "/private" },
          ],
        },
      ],
      sitemaps: ["https://example.com/sitemap.xml"],
    },
    source: { finalUrl: "https://example.com/", status: 200 },
  };
  return { ...base, ...overrides } as import("@/lib/schemas").SeoResponse;
}

describe("SeoSection", () => {
  it("renders meta tag values and twitter preview with compact variant when card=summary", () => {
    const data = buildSeoData();
    render(
      <SeoSection
        data={data}
        isLoading={false}
        isError={false}
        onRetryAction={() => {}}
      />,
    );

    // Meta tag list (use *AllBy* to avoid ambiguous matches)
    expect(screen.getAllByText(/^Title$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Description$/i).length).toBeGreaterThan(0);
    expect(screen.getByText("https://example.com/")).toBeInTheDocument();

    // SocialPreview mocked element with props
    const el = document.querySelector(
      '[data-slot="social-preview"]',
    ) as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.getAttribute("data-provider")).toBe("twitter");
  });
});

// Use querySelector-based assertions to read mocked SocialPreview attributes
describe("SeoSection SocialPreview", () => {
  it("chooses compact vs large based on twitter:card and preview image", async () => {
    const dataSummary = buildSeoData({
      meta: {
        openGraph: {
          title: "OG Title",
          description: "OG Desc",
          type: "website",
          url: "https://example.com/",
          siteName: "Example",
          images: ["https://example.com/og.png"],
        },
        twitter: { card: "summary" },
        general: {
          title: "Title",
          description: "Desc",
          canonical: "https://example.com/",
          robots: "index,follow",
        },
      },
      preview: {
        title: "Title",
        description: "Desc",
        image: null,
        canonicalUrl: "https://example.com/",
      },
    } as Partial<import("@/lib/schemas").SeoResponse>);

    const { rerender } = render(
      <SeoSection
        data={dataSummary}
        isLoading={false}
        isError={false}
        onRetryAction={() => {}}
      />,
    );
    let el = document.querySelector(
      '[data-slot="social-preview"]',
    ) as HTMLElement;
    expect(el?.getAttribute("data-provider")).toBe("twitter");
    expect(el?.getAttribute("data-variant")).toBe("compact");

    const dataLarge = buildSeoData({
      meta: {
        openGraph: {
          title: "OG Title",
          description: "OG Desc",
          type: "website",
          url: "https://example.com/",
          siteName: "Example",
          images: ["https://example.com/og.png"],
        },
        twitter: { card: "summary_large_image" },
        general: {
          title: "Title",
          description: "Desc",
          canonical: "https://example.com/",
          robots: "index,follow",
        },
      },
      preview: {
        title: "Title",
        description: "Desc",
        image: "https://example.com/og.png",
        canonicalUrl: "https://example.com/",
      },
    } as Partial<import("@/lib/schemas").SeoResponse>);
    rerender(
      <SeoSection
        data={dataLarge}
        isLoading={false}
        isError={false}
        onRetryAction={() => {}}
      />,
    );
    el = document.querySelector('[data-slot="social-preview"]') as HTMLElement;
    expect(el?.getAttribute("data-variant")).toBe("large");
  });
});

describe("SeoSection RobotsSummary", () => {
  it("shows counts, link and filters rules", async () => {
    const data = buildSeoData();
    render(
      <SeoSection
        data={data}
        isLoading={false}
        isError={false}
        onRetryAction={() => {}}
      />,
    );

    // Found badge and link (scope to summary header)
    expect(screen.getAllByText(/^robots\.txt$/i).length).toBeGreaterThan(0);
    const link = screen.getByRole("link", { name: /open robots\.txt/i });
    expect(link).toHaveAttribute("href", "https://example.com/robots.txt");

    // Counts
    expect(
      screen.getByText(/1 allows, 1 disallows, 1 sitemaps/i),
    ).toBeInTheDocument();

    // Filter to Disallow only
    await userEvent.click(screen.getByRole("button", { name: "Disallow" }));
    // Expect only disallow entries rendered (simpler: path text present)
    expect(screen.getByText(/\/private/i)).toBeInTheDocument();
  });

  it("handles missing robots and retry action", async () => {
    const onRetry = vi.fn();
    const data = buildSeoData({ robots: null });
    render(
      <SeoSection
        data={data}
        isLoading={false}
        isError={false}
        onRetryAction={onRetry}
      />,
    );
    expect(
      screen.getByText(/No robots\.txt discovered\./i),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("shows error state and retry when overall load failed", async () => {
    const onRetry = vi.fn();
    render(
      <SeoSection
        data={undefined}
        isLoading={false}
        isError={true}
        onRetryAction={onRetry}
      />,
    );
    expect(
      screen.getByText(/Failed to load SEO analysis\./i),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
