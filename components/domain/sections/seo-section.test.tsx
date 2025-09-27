import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SeoSection } from "./seo-section";

// Mock Radix Accordion primitives used by Section and RobotsSummary
vi.mock("@/components/ui/accordion", () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="accordion">{children}</div>
  ),
  AccordionItem: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-slot="accordion-item" {...props}>
      {children}
    </div>
  ),
  AccordionTrigger: ({ children, ...props }: { children: React.ReactNode }) => (
    <button type="button" data-slot="accordion-trigger" {...props}>
      {children}
    </button>
  ),
  AccordionContent: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-slot="accordion-content" {...props}>
      {children}
    </div>
  ),
}));

// Mock Tabs to avoid Radix state/DOM wiring in tests
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tabs">{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tabs-list">{children}</div>
  ),
  TabsTrigger: ({ children, ...props }: { children: React.ReactNode }) => (
    <button type="button" data-slot="tabs-trigger" {...props}>
      {children}
    </button>
  ),
  TabsContent: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tabs-content">{children}</div>
  ),
}));

// TooltipProvider is used by Section header help
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tooltip-provider">{children}</div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tooltip">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tooltip-content">{children}</div>
  ),
}));

// next/image mock to simple img for JSDOM; strip Next-only props
vi.mock("next/image", () => ({
  __esModule: true,
  // biome-ignore lint/suspicious/noExplicitAny: testing stub
  default: (props: any) => {
    const { unoptimized, loader, fill, ...rest } = props;
    // biome-ignore lint/performance/noImgElement: testing stub
    return <img {...rest} alt="testing stub" />;
  },
}));

describe("SeoSection", () => {
  it("renders social tabs, preview, raw meta, and robots summary when data present", () => {
    const data = {
      meta: {
        openGraph: {
          title: "OG Title",
          description: "OG Description",
          type: "website",
          url: "https://example.com/og",
          siteName: "Example Site",
          images: ["https://example.com/og.png"],
        },
        twitter: {
          card: "summary_large_image",
          title: "TW Title",
          description: "TW Description",
          image: "https://example.com/tw.png",
        },
        general: {
          title: "General Title",
          description: "General Description",
          canonical: "https://example.com/",
          robots: "index,follow",
        },
      },
      robots: {
        fetched: true,
        groups: [
          {
            userAgents: ["*"],
            rules: [
              { type: "allow", value: "/" },
              { type: "disallow", value: "/admin" },
              { type: "crawlDelay", value: "10" },
            ],
          },
          {
            userAgents: ["googlebot"],
            rules: [{ type: "allow", value: "/blog" }],
          },
        ],
        sitemaps: ["https://example.com/sitemap.xml"],
      },
      preview: {
        title: "Preview Title",
        description: "Preview Description",
        image: "https://example.com/preview.png",
        canonicalUrl: "https://example.com/",
      },
      timestamps: { fetchedAt: "2024-01-01T00:00:00.000Z" },
      source: { finalUrl: "https://example.com/page", status: 200 },
    } as unknown as React.ComponentProps<typeof SeoSection>["data"];

    render(
      <SeoSection
        data={data}
        isLoading={false}
        isError={false}
        onRetryAction={() => {}}
      />,
    );

    // Section title
    expect(screen.getByText("SEO & Social")).toBeInTheDocument();

    // Tabs and preview content
    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.getByText("Facebook")).toBeInTheDocument();
    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByText("Pinterest")).toBeInTheDocument();
    expect(screen.getByText("Raw Data")).toBeInTheDocument();
    // Tabs are mocked to render all contents, so previews repeat across platforms
    expect(screen.getAllByText("Preview Title").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Preview Description").length).toBeGreaterThan(0);

    // Raw data shows OG fields
    expect(screen.getByText("OG Site Name")).toBeInTheDocument();
    expect(screen.getAllByText("Example Site").length).toBeGreaterThan(0);

    // Robots summary
    expect(screen.getByText("robots.txt")).toBeInTheDocument();
    expect(screen.getByText("Found")).toBeInTheDocument();
    expect(
      screen.getByText(/2 allows, 1 disallows, 1 sitemaps/i),
    ).toBeInTheDocument();
    const link = screen.getByText("Open robots.txt").closest("a");
    expect(link).toHaveAttribute("href", "https://example.com/robots.txt");
    expect(screen.getByText("googlebot")).toBeInTheDocument();
  });

  it("shows error state with retry when isError", () => {
    render(
      <SeoSection
        data={null}
        isLoading={false}
        isError
        onRetryAction={() => {}}
      />,
    );
    expect(
      screen.getByText(/Failed to load SEO analysis/i),
    ).toBeInTheDocument();
  });

  it("shows loading skeletons when loading", () => {
    render(
      <SeoSection
        data={null}
        isLoading
        isError={false}
        onRetryAction={() => {}}
      />,
    );
    // section renders with title while skeleton is shown
    expect(screen.getByText("SEO & Social")).toBeInTheDocument();
  });
});
