import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { HeadersSection } from "./headers-section";

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

describe("HeadersSection", () => {
  it("highlights important headers and renders values", () => {
    const data = [
      { name: "strict-transport-security", value: "max-age=63072000" },
      { name: "server", value: "vercel" },
      { name: "x-powered-by", value: "nextjs" },
    ];
    render(
      <HeadersSection
        data={data}
        isLoading={false}
        isError={false}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText("strict-transport-security")).toBeInTheDocument();
    const values = screen.getAllByText("max-age=63072000");
    // pick the main value span (not tooltip content) by role absence
    expect(values.some((n) => n.tagName.toLowerCase() === "span")).toBe(true);
  });

  it("shows error state", () => {
    render(
      <HeadersSection
        data={null}
        isLoading={false}
        isError
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText(/Failed to load headers/i)).toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    render(
      <HeadersSection
        data={null}
        isLoading
        isError={false}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText("HTTP Headers")).toBeInTheDocument();
  });
});
