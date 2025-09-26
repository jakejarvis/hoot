import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { TruncatedValue } from "./truncated-value";

// Mock tooltip primitives to avoid portal/interaction complexity
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tooltip">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({
    className,
    children,
  }: {
    className?: string;
    children: React.ReactNode;
  }) => (
    <div data-slot="tooltip-content" className={className}>
      {children}
    </div>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tooltip-provider">{children}</div>
  ),
}));

describe("TruncatedValue", () => {
  it("hides tooltip content when not truncated", () => {
    const ref = React.createRef<HTMLSpanElement | null>();
    render(
      <TruncatedValue
        value="Example Value"
        isTruncated={false}
        valueRef={ref}
      />,
    );
    const content = document.querySelector(
      '[data-slot="tooltip-content"]',
    ) as HTMLElement | null;
    expect(content).not.toBeNull();
    expect(content?.className).toMatch(/hidden/);
  });

  it("shows tooltip content when truncated", () => {
    const ref = React.createRef<HTMLSpanElement | null>();
    render(
      <TruncatedValue
        value="A very long example value"
        isTruncated
        valueRef={ref}
      />,
    );
    const content = document.querySelector(
      '[data-slot="tooltip-content"]',
    ) as HTMLElement | null;
    expect(content).not.toBeNull();
    expect(content?.className).not.toMatch(/hidden/);
    expect(content?.textContent).toMatch(/A very long example value/);
  });
});
