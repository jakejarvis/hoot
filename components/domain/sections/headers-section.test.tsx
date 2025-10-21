/* @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeadersSection } from "./headers-section";

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
    const data = {
      headers: [
        { name: "strict-transport-security", value: "max-age=63072000" },
        { name: "server", value: "vercel" },
        { name: "x-powered-by", value: "nextjs" },
      ] as Array<{ name: string; value: string }>,
      source: undefined,
    };
    render(
      <HeadersSection
        domain="example.com"
        data={data}
        isLoading={false}
        isError={false}
        onRetryAction={() => {}}
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
        domain="example.com"
        data={null}
        isLoading={false}
        isError
        onRetryAction={() => {}}
      />,
    );
    expect(screen.getByText(/Failed to load headers/i)).toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    render(
      <HeadersSection
        domain="example.com"
        data={null}
        isLoading
        isError={false}
        onRetryAction={() => {}}
      />,
    );
    expect(screen.getByText("HTTP Headers")).toBeInTheDocument();
  });
});
