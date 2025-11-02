/* @vitest-environment jsdom */
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SeoResponse } from "@/lib/schemas";
import { SeoSection } from "./seo-section";

vi.mock("@/components/domain/screenshot", () => ({
  Screenshot: ({ domain }: { domain: string }) => (
    <div data-slot="screenshot">{domain}</div>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tooltip">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button" data-slot="tooltip-trigger">
      {children}
    </button>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tooltip-content">{children}</div>
  ),
}));

vi.mock("@/components/ui/accordion", () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="accordion">{children}</div>
  ),
  AccordionContent: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="accordion-content">{children}</div>
  ),
  AccordionItem: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="accordion-item">{children}</div>
  ),
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button" data-slot="accordion-trigger">
      {children}
    </button>
  ),
}));

/**
 * Test fixture builder for SeoResponse objects.
 * Provides strongly-typed defaults with easy overrides.
 */
function buildSeoResponse(overrides: Partial<SeoResponse> = {}): SeoResponse {
  return {
    meta: {
      openGraph: {},
      twitter: {},
      general: {},
    },
    robots: null,
    preview: null,
    source: {
      finalUrl: null,
      status: null,
    },
    errors: undefined,
    ...overrides,
  };
}

describe("SeoSection", () => {
  describe("basic rendering", () => {
    it("renders meta title and description", () => {
      const data = buildSeoResponse({
        meta: {
          openGraph: { title: "OG Title" },
          twitter: { card: "summary" },
          general: { robots: "index, follow" },
        },
        preview: {
          title: "Page Title",
          description: "Page description",
          image: null,
          imageUploaded: null,
          canonicalUrl: "https://example.com",
        },
      });
      render(<SeoSection domain="example.com" data={data} />);
      // Use getAllByText since title appears in multiple places (value + tooltip + preview)
      const titleElements = screen.getAllByText("Page Title");
      expect(titleElements.length).toBeGreaterThan(0);
    });

    it("shows empty state when no meta tags", () => {
      const data = buildSeoResponse();
      render(<SeoSection domain="example.com" data={data} />);
      expect(screen.getByText(/No SEO meta detected/i)).toBeInTheDocument();
    });

    it("renders all available meta tags", () => {
      const data = buildSeoResponse({
        meta: {
          openGraph: {},
          twitter: {},
          general: {
            keywords: "seo, testing",
            author: "Test Author",
            generator: "Next.js",
            robots: "index, follow",
          },
        },
        preview: {
          title: "Test Title",
          description: "Test Description",
          image: "https://example.com/image.png",
          imageUploaded: null,
          canonicalUrl: "https://example.com/canonical",
        },
      });
      render(<SeoSection domain="example.com" data={data} />);
      // Use getAllByText for elements that appear multiple times
      expect(screen.getAllByText("Test Title").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Test Description").length).toBeGreaterThan(0);
      expect(screen.getAllByText("seo, testing").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Test Author").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Next.js").length).toBeGreaterThan(0);
      expect(screen.getAllByText("index, follow").length).toBeGreaterThan(0);
    });
  });

  describe("Twitter card variants", () => {
    it("renders compact card for summary variant", () => {
      const data = buildSeoResponse({
        meta: {
          openGraph: {},
          twitter: { card: "summary" },
          general: {},
        },
        preview: {
          title: "Compact Card Title",
          description: "Compact Card Description",
          image: "https://example.com/image.png",
          imageUploaded: "https://example.com/uploaded.png",
          canonicalUrl: "https://example.com",
        },
      });
      render(<SeoSection domain="example.com" data={data} />);
      const preview = screen.getByRole("link", {
        name: /open example.com in a new tab/i,
      });
      expect(preview).toHaveAttribute("data-provider", "twitter");
      expect(preview).toHaveAttribute("data-variant", "compact");
    });

    it("renders large card for summary_large_image variant", () => {
      const data = buildSeoResponse({
        meta: {
          openGraph: {},
          twitter: { card: "summary_large_image" },
          general: {},
        },
        preview: {
          title: "Large Card Title",
          description: "Large Card Description",
          image: "https://example.com/image.png",
          imageUploaded: "https://example.com/uploaded.png",
          canonicalUrl: "https://example.com",
        },
      });
      render(<SeoSection domain="example.com" data={data} />);
      const preview = screen.getByRole("link", {
        name: /open example.com in a new tab/i,
      });
      expect(preview).toHaveAttribute("data-provider", "twitter");
      expect(preview).toHaveAttribute("data-variant", "large");
    });

    it("defaults to large variant when image present but no twitter card specified", () => {
      const data = buildSeoResponse({
        meta: {
          openGraph: {},
          twitter: {},
          general: {},
        },
        preview: {
          title: "Default Large Card",
          description: "Has image but no twitter:card meta",
          image: "https://example.com/image.png",
          imageUploaded: "https://example.com/uploaded.png",
          canonicalUrl: "https://example.com",
        },
      });
      render(<SeoSection domain="example.com" data={data} />);
      const preview = screen.getByRole("link", {
        name: /open example.com in a new tab/i,
      });
      expect(preview).toHaveAttribute("data-variant", "large");
    });

    it("defaults to compact variant when no image and no twitter card specified", () => {
      const data = buildSeoResponse({
        meta: {
          openGraph: {},
          twitter: {},
          general: {},
        },
        preview: {
          title: "Default Compact Card",
          description: "No image and no twitter:card meta",
          image: null,
          imageUploaded: null,
          canonicalUrl: "https://example.com",
        },
      });
      render(<SeoSection domain="example.com" data={data} />);
      const preview = screen.getByRole("link", {
        name: /open example.com in a new tab/i,
      });
      expect(preview).toHaveAttribute("data-variant", "compact");
    });
  });

  describe("tab switching", () => {
    it("switches between social preview providers", async () => {
      const user = userEvent.setup();
      const data = buildSeoResponse({
        meta: {
          openGraph: {},
          twitter: {},
          general: {},
        },
        preview: {
          title: "Social Preview",
          description: "Testing tab switching",
          image: "https://example.com/image.png",
          imageUploaded: "https://example.com/uploaded.png",
          canonicalUrl: "https://example.com",
        },
      });
      render(<SeoSection domain="example.com" data={data} />);

      // Initial state: Twitter tab active
      const twitterPreview = screen.getByRole("link", {
        name: /open example.com in a new tab/i,
      });
      expect(twitterPreview).toHaveAttribute("data-provider", "twitter");

      // Click Facebook tab
      const facebookTab = screen.getByRole("tab", { name: /facebook/i });
      await user.click(facebookTab);
      const facebookPreview = screen.getByRole("link", {
        name: /open example.com in a new tab/i,
      });
      expect(facebookPreview).toHaveAttribute("data-provider", "facebook");

      // Click LinkedIn tab
      const linkedinTab = screen.getByRole("tab", { name: /linkedin/i });
      await user.click(linkedinTab);
      const linkedinPreview = screen.getByRole("link", {
        name: /open example.com in a new tab/i,
      });
      expect(linkedinPreview).toHaveAttribute("data-provider", "linkedin");

      // Click Discord tab
      const discordTab = screen.getByRole("tab", { name: /discord/i });
      await user.click(discordTab);
      const discordPreview = screen.getByRole("link", {
        name: /open example.com in a new tab/i,
      });
      expect(discordPreview).toHaveAttribute("data-provider", "discord");

      // Click Slack tab
      const slackTab = screen.getByRole("tab", { name: /slack/i });
      await user.click(slackTab);
      const slackPreview = screen.getByRole("link", {
        name: /open example.com in a new tab/i,
      });
      expect(slackPreview).toHaveAttribute("data-provider", "slack");
    });

    it("renders correct active tab content", async () => {
      const user = userEvent.setup();
      const data = buildSeoResponse({
        meta: {
          openGraph: {},
          twitter: {},
          general: {},
        },
        preview: {
          title: "Tab Content Test",
          description: "Verifying correct content per tab",
          image: "https://example.com/image.png",
          imageUploaded: "https://example.com/uploaded.png",
          canonicalUrl: "https://example.com",
        },
      });
      render(<SeoSection domain="example.com" data={data} />);

      // Check initial Twitter content
      expect(
        screen.getByRole("link", { name: /open example.com in a new tab/i }),
      ).toHaveAttribute("data-provider", "twitter");

      // Switch to Facebook and verify
      await user.click(screen.getByRole("tab", { name: /facebook/i }));
      expect(
        screen.getByRole("link", { name: /open example.com in a new tab/i }),
      ).toHaveAttribute("data-provider", "facebook");
    });
  });

  describe("robots.txt rendering", () => {
    it("renders robots.txt rules and sitemaps", () => {
      const data = buildSeoResponse({
        meta: {
          openGraph: {},
          twitter: {},
          general: {},
        },
        preview: {
          title: "Page with Robots",
          description: "Testing robots.txt",
          image: null,
          imageUploaded: null,
          canonicalUrl: "https://example.com",
        },
        robots: {
          fetched: true,
          groups: [
            {
              userAgents: ["*"],
              rules: [
                { type: "disallow", value: "/admin" },
                { type: "allow", value: "/public" },
              ],
            },
          ],
          sitemaps: ["https://example.com/sitemap.xml"],
        },
      });
      render(<SeoSection domain="example.com" data={data} />);

      // Verify robots.txt link
      expect(screen.getByRole("link", { name: /robots.txt/i })).toHaveAttribute(
        "href",
        "https://example.com/robots.txt",
      );

      // Verify rules are present (in accordion)
      expect(screen.getByText("/admin")).toBeInTheDocument();
      expect(screen.getByText("/public")).toBeInTheDocument();

      // Verify sitemap
      expect(screen.getByRole("link", { name: /sitemap/i })).toHaveAttribute(
        "href",
        "https://example.com/sitemap.xml",
      );
    });

    it("shows empty state when no robots.txt found", () => {
      const data = buildSeoResponse({
        meta: {
          openGraph: {},
          twitter: {},
          general: {},
        },
        preview: {
          title: "Page without Robots",
          description: "No robots.txt",
          image: null,
          imageUploaded: null,
          canonicalUrl: "https://example.com",
        },
        robots: null,
      });
      render(<SeoSection domain="example.com" data={data} />);
      expect(screen.getByText(/No robots.txt found/i)).toBeInTheDocument();
    });

    it("shows appropriate message when robots.txt has no rules but has sitemaps", () => {
      const data = buildSeoResponse({
        meta: {
          openGraph: {},
          twitter: {},
          general: {},
        },
        preview: {
          title: "Robots with Sitemaps Only",
          description: "Has sitemaps but no crawl rules",
          image: null,
          imageUploaded: null,
          canonicalUrl: "https://example.com",
        },
        robots: {
          fetched: true,
          groups: [],
          sitemaps: [
            "https://example.com/sitemap.xml",
            "https://example.com/sitemap-2.xml",
          ],
        },
      });
      render(<SeoSection domain="example.com" data={data} />);
      expect(screen.getByText(/No crawl rules detected/i)).toBeInTheDocument();
      // Sitemaps heading appears multiple times (in meta and in robots section)
      expect(screen.getAllByText("Sitemaps").length).toBeGreaterThan(0);
    });

    it("handles multiple robot groups with different user agents", () => {
      const data = buildSeoResponse({
        meta: {
          openGraph: {},
          twitter: {},
          general: {},
        },
        preview: {
          title: "Multiple Robot Groups",
          description: "Testing multiple user agents",
          image: null,
          imageUploaded: null,
          canonicalUrl: "https://example.com",
        },
        robots: {
          fetched: true,
          groups: [
            {
              userAgents: ["*"],
              rules: [{ type: "disallow", value: "/private" }],
            },
            {
              userAgents: ["Googlebot"],
              rules: [{ type: "allow", value: "/special" }],
            },
          ],
          sitemaps: [],
        },
      });
      render(<SeoSection domain="example.com" data={data} />);
      // "All" appears in both the filter button and the user agent badge
      expect(screen.getAllByText("All").length).toBeGreaterThan(0);
      expect(screen.getByText("Googlebot")).toBeInTheDocument();
    });
  });

  describe("redirect alert", () => {
    it("shows alert when domain redirects to different domain", () => {
      const data = buildSeoResponse({
        meta: {
          openGraph: {},
          twitter: {},
          general: {},
        },
        preview: {
          title: "Redirected Page",
          description: "This page redirected",
          image: null,
          imageUploaded: null,
          canonicalUrl: "https://redirected.com",
        },
        source: {
          finalUrl: "https://redirected.com",
          status: 301,
        },
      });
      render(<SeoSection domain="example.com" data={data} />);
      expect(screen.getByText(/We followed a redirect/i)).toBeInTheDocument();
      // Use getAllByRole since the domain appears in multiple contexts
      const links = screen.getAllByRole("link");
      const redirectLink = links.find((link) =>
        link.textContent?.includes("redirected.com"),
      );
      expect(redirectLink).toBeDefined();
    });

    it("does not show alert when no redirect occurred", () => {
      const data = buildSeoResponse({
        meta: {
          openGraph: {},
          twitter: {},
          general: {},
        },
        preview: {
          title: "No Redirect",
          description: "Stayed on same domain",
          image: null,
          imageUploaded: null,
          canonicalUrl: "https://example.com",
        },
        source: {
          finalUrl: "https://example.com",
          status: 200,
        },
      });
      render(<SeoSection domain="example.com" data={data} />);
      expect(
        screen.queryByText(/We followed a redirect/i),
      ).not.toBeInTheDocument();
    });

    it("does not show alert when final URL is same domain with www", () => {
      const data = buildSeoResponse({
        meta: {
          openGraph: {},
          twitter: {},
          general: {},
        },
        preview: {
          title: "WWW Redirect",
          description: "Redirected to www subdomain",
          image: null,
          imageUploaded: null,
          canonicalUrl: "https://www.example.com",
        },
        source: {
          finalUrl: "https://www.example.com",
          status: 301,
        },
      });
      render(<SeoSection domain="example.com" data={data} />);
      expect(
        screen.queryByText(/We followed a redirect/i),
      ).not.toBeInTheDocument();
    });

    it("does not show alert when finalUrl is null", () => {
      const data = buildSeoResponse({
        meta: {
          openGraph: {},
          twitter: {},
          general: {},
        },
        preview: {
          title: "No Final URL",
          description: "Final URL is null",
          image: null,
          imageUploaded: null,
          canonicalUrl: "https://example.com",
        },
        source: {
          finalUrl: null,
          status: null,
        },
      });
      render(<SeoSection domain="example.com" data={data} />);
      expect(
        screen.queryByText(/We followed a redirect/i),
      ).not.toBeInTheDocument();
    });
  });

  describe("parameterized meta tag combinations", () => {
    const testCases: Array<{
      name: string;
      meta: SeoResponse["meta"];
      preview: SeoResponse["preview"];
      expectedTags: string[];
    }> = [
      {
        name: "minimal meta tags",
        meta: {
          openGraph: {},
          twitter: {},
          general: {},
        },
        preview: {
          title: "Minimal Title",
          description: null,
          image: null,
          imageUploaded: null,
          canonicalUrl: "https://example.com",
        },
        expectedTags: ["Minimal Title"],
      },
      {
        name: "complete meta tags",
        meta: {
          openGraph: { title: "OG Title" },
          twitter: { card: "summary", title: "Twitter Title" },
          general: {
            keywords: "test, seo",
            author: "Test Author",
            generator: "Next.js",
            robots: "index, follow",
          },
        },
        preview: {
          title: "Complete Title",
          description: "Complete Description",
          image: "https://example.com/og.png",
          imageUploaded: null,
          canonicalUrl: "https://example.com/canonical",
        },
        expectedTags: [
          "Complete Title",
          "Complete Description",
          "test, seo",
          "Test Author",
          "Next.js",
          "index, follow",
        ],
      },
      {
        name: "only keywords and author",
        meta: {
          openGraph: {},
          twitter: {},
          general: { keywords: "keyword1, keyword2", author: "John Doe" },
        },
        preview: {
          title: null,
          description: null,
          image: null,
          imageUploaded: null,
          canonicalUrl: "https://example.com",
        },
        expectedTags: ["keyword1, keyword2", "John Doe"],
      },
      {
        name: "only canonical URL",
        meta: {
          openGraph: {},
          twitter: {},
          general: {},
        },
        preview: {
          title: null,
          description: null,
          image: null,
          imageUploaded: null,
          canonicalUrl: "https://example.com/page",
        },
        expectedTags: ["https://example.com/page"],
      },
    ];

    for (const testCase of testCases) {
      it(`renders ${testCase.name}`, () => {
        const data = buildSeoResponse({
          meta: testCase.meta,
          preview: testCase.preview,
        });
        render(<SeoSection domain="example.com" data={data} />);
        // Use getAllByText to handle elements that appear in multiple places
        for (const expectedTag of testCase.expectedTags) {
          const elements = screen.getAllByText(expectedTag);
          expect(elements.length).toBeGreaterThan(0);
        }
      });
    }
  });

  describe("social preview rendering across providers", () => {
    const providers: Array<{
      provider: "twitter" | "facebook" | "linkedin" | "discord" | "slack";
      tabName: string;
    }> = [
      { provider: "twitter", tabName: "Twitter" },
      { provider: "facebook", tabName: "Facebook" },
      { provider: "linkedin", tabName: "LinkedIn" },
      { provider: "discord", tabName: "Discord" },
      { provider: "slack", tabName: "Slack" },
    ];

    for (const { provider, tabName } of providers) {
      it(`renders ${provider} preview correctly`, async () => {
        const user = userEvent.setup();
        const data = buildSeoResponse({
          meta: {
            openGraph: {},
            twitter: {},
            general: {},
          },
          preview: {
            title: `${provider} Preview Title`,
            description: `${provider} Preview Description`,
            image: `https://example.com/${provider}.png`,
            imageUploaded: `https://example.com/${provider}-uploaded.png`,
            canonicalUrl: "https://example.com",
          },
        });
        render(<SeoSection domain="example.com" data={data} />);

        // Switch to the provider's tab
        const tab = screen.getByRole("tab", { name: new RegExp(tabName, "i") });
        await user.click(tab);

        // Verify the preview is rendered with correct provider
        const preview = screen.getByRole("link", {
          name: /open example.com in a new tab/i,
        });
        expect(preview).toHaveAttribute("data-provider", provider);
      });

      it(`renders ${provider} preview without image`, async () => {
        const user = userEvent.setup();
        const data = buildSeoResponse({
          meta: {
            openGraph: {},
            twitter: {},
            general: {},
          },
          preview: {
            title: `${provider} No Image`,
            description: `${provider} description without image`,
            image: null,
            imageUploaded: null,
            canonicalUrl: "https://example.com",
          },
        });
        render(<SeoSection domain="example.com" data={data} />);

        const tab = screen.getByRole("tab", { name: new RegExp(tabName, "i") });
        await user.click(tab);

        const preview = screen.getByRole("link", {
          name: /open example.com in a new tab/i,
        });
        expect(preview).toHaveAttribute("data-provider", provider);
        // Verify "No image" accessible text is present in the DOM
        const previewContainer = within(preview);
        expect(previewContainer.getByText("No image")).toBeInTheDocument();
      });
    }

    it("uses imageUploaded when available", async () => {
      const user = userEvent.setup();
      const uploadedImageUrl = "https://example.com/uploaded-image.png";
      const data = buildSeoResponse({
        meta: {
          openGraph: {},
          twitter: {},
          general: {},
        },
        preview: {
          title: "Uploaded Image Preview",
          description: "Preview with uploaded image",
          image: "https://example.com/original.png",
          imageUploaded: uploadedImageUrl,
          canonicalUrl: "https://example.com",
        },
      });
      render(<SeoSection domain="example.com" data={data} />);

      // Twitter preview should be visible by default
      const preview = screen.getByRole("link", {
        name: /open example.com in a new tab/i,
      });
      expect(preview).toBeInTheDocument();

      // Switch to Facebook to verify imageUploaded is used
      await user.click(screen.getByRole("tab", { name: /facebook/i }));
      const facebookPreview = screen.getByRole("link", {
        name: /open example.com in a new tab/i,
      });
      // Check that the preview image element uses the uploaded URL
      const image = within(facebookPreview).getByAltText("Preview image");
      expect(image).toHaveAttribute("src", expect.stringContaining("uploaded"));
    });
  });
});
