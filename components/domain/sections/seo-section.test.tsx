import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

// Mock Separator to a simple hr
vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr data-slot="separator" />,
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
    // biome-ignore lint/correctness/noUnusedVariables: testing stub
    const { unoptimized, loader, fill, ...rest } = props;
    // biome-ignore lint/performance/noImgElement: testing stub
    return <img alt="testing stub" {...rest} />;
  },
}));

function makeData(overrides?: Partial<Parameters<typeof buildData>[0]>) {
  return buildData(overrides);
}

function buildData({
  title = "OG Title",
  description = "OG Description",
  image = "https://example.com/og.png",
  robotsGroups = [
    {
      userAgents: ["*"],
      rules: [
        { type: "allow" as const, value: "/" },
        { type: "disallow" as const, value: "/admin" },
      ],
    },
  ],
  sitemaps = ["https://example.com/sitemap.xml"],
}: {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  robotsGroups?: Array<{
    userAgents: string[];
    rules: Array<{ type: "allow" | "disallow" | "crawlDelay"; value: string }>;
  }>;
  sitemaps?: string[];
} = {}) {
  return {
    meta: {
      openGraph: {
        title: title ?? undefined,
        description: description ?? undefined,
        url: "https://example.com/",
        siteName: "Ex",
        images: image ? [image] : [],
      },
      twitter: {},
      general: {
        title: undefined,
        description: undefined,
        canonical: "https://example.com/",
        robots: undefined,
      },
    },
    robots: {
      fetched: true,
      groups: robotsGroups,
      sitemaps,
    },
    preview: {
      title: title ?? null,
      description: description ?? null,
      image: image ?? null,
      canonicalUrl: "https://example.com/",
    },
    timestamps: { fetchedAt: new Date(0).toISOString() },
    source: { finalUrl: "https://example.com/", status: 200 },
  } as const;
}

describe("SeoSection", () => {
  it("renders tabs and preview content", () => {
    const data = makeData();
    render(
      <SeoSection
        data={data as unknown as Parameters<typeof SeoSection>[0]["data"]}
        isLoading={false}
        isError={false}
        onRetryAction={() => {}}
      />,
    );
    expect(screen.getByRole("tab", { name: /x/i })).toBeInTheDocument();
    expect(screen.getByText(/OG Title/i)).toBeInTheDocument();
    expect(screen.getByText(/OG Description/i)).toBeInTheDocument();
  });

  it("renders robots summary with counts and sitemap link", () => {
    const data = makeData();
    render(
      <SeoSection
        data={data as unknown as Parameters<typeof SeoSection>[0]["data"]}
        isLoading={false}
        isError={false}
        onRetryAction={() => {}}
      />,
    );
    expect(screen.getByText(/robots\.txt/i)).toBeInTheDocument();
    expect(screen.getByText(/allows/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /sitemap/i }),
    ).not.toBeInTheDocument();
    // We show sitemap URL as the link text
    expect(
      screen.getByRole("link", { name: data.robots?.sitemaps[0] as string }),
    ).toBeInTheDocument();
  });

  it("filters robots rules by text and type", async () => {
    const user = userEvent.setup();
    const data = makeData({
      robotsGroups: [
        {
          userAgents: ["*"],
          rules: [
            { type: "allow", value: "/" },
            { type: "disallow", value: "/private" },
            { type: "disallow", value: "/admin" },
          ],
        },
      ],
    });
    render(
      <SeoSection
        data={data as unknown as Parameters<typeof SeoSection>[0]["data"]}
        isLoading={false}
        isError={false}
        onRetryAction={() => {}}
      />,
    );

    // Expand the group
    const trigger = screen.getByRole("button", { name: /\* \d+ allow/i });
    await user.click(trigger);

    // Type filter
    const input = screen.getByPlaceholderText(/filter rules/i);
    await user.type(input, "admin");
    expect(screen.getByText(/admin/)).toBeInTheDocument();

    // Toggle Allow should hide the disallow items
    await user.click(screen.getByRole("button", { name: /^allow$/i }));
    expect(screen.queryByText(/admin/)).not.toBeInTheDocument();
  });
});
