import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import type { SeoData } from "@/lib/seo";
import { SeoSection } from "./seo-section";

// Mock Accordion from Section
vi.mock("@/components/ui/accordion", () => ({
  AccordionItem: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="accordion-item">{children}</div>
  ),
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button" data-slot="accordion-trigger">
      {children}
    </button>
  ),
  AccordionContent: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="accordion-content">{children}</div>
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

// Mock Tabs for SeoContent
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tabs">{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tabs-list">{children}</div>
  ),
  TabsTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tabs-trigger">{children}</div>
  ),
  TabsContent: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tabs-content">{children}</div>
  ),
}));

// Mock Card components for PreviewCard
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="card">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="card-title">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="card-content">{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="card-description">{children}</div>
  ),
}));

describe("SeoSection", () => {
  const mockSeoData: SeoData = {
    meta: {
      openGraph: {
        title: "Test OG Title",
        description: "Test OG Description",
        images: ["https://example.com/og-image.jpg"],
      },
      twitter: {
        card: "summary_large_image",
        title: "Test Twitter Title",
      },
      general: {
        title: "Test Page Title",
        description: "Test page description",
      },
    },
    robots: {
      fetched: true,
      groups: [],
      sitemaps: ["https://example.com/sitemap.xml"],
    },
    preview: {
      title: "Test OG Title",
      description: "Test OG Description",
      image: "https://example.com/og-image.jpg",
      canonicalUrl: "https://example.com",
    },
    timestamps: {
      fetchedAt: "2024-01-01T00:00:00.000Z",
    },
    source: {
      finalUrl: "https://example.com",
      status: 200,
    },
  };

  it("renders SEO section with data", () => {
    render(
      <SeoSection
        data={mockSeoData}
        isLoading={false}
        isError={false}
        onRetryAction={() => {}}
      />,
    );

    expect(screen.getByText("SEO & Social")).toBeInTheDocument();
    expect(screen.getByText("Social Previews")).toBeInTheDocument();
    expect(screen.getByText("Meta Tags")).toBeInTheDocument();
    expect(screen.getByText("Robots.txt")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(
      <SeoSection
        data={null}
        isLoading={true}
        isError={false}
        onRetryAction={() => {}}
      />,
    );

    expect(screen.getByText("SEO & Social")).toBeInTheDocument();
    // Should show skeletons when loading
  });

  it("shows error state", () => {
    render(
      <SeoSection
        data={null}
        isLoading={false}
        isError={true}
        onRetryAction={() => {}}
      />,
    );

    expect(screen.getByText("Failed to load SEO & social data")).toBeInTheDocument();
  });
});