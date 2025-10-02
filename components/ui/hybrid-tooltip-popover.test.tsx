import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HybridTooltipPopover,
  HybridTooltipPopoverContent,
  HybridTooltipPopoverTrigger,
} from "./hybrid-tooltip-popover";

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children, open, onOpenChange }: any) => (
    <div data-slot="tooltip" data-open={open} onClick={() => onOpenChange?.(true)}>
      {children}
    </div>
  ),
  TooltipTrigger: ({ children, ...props }: any) => (
    <button
      type="button"
      data-slot="tooltip-trigger"
      data-testid="tooltip-trigger"
      {...props}
    >
      {children}
    </button>
  ),
  TooltipContent: ({ children, hideArrow: _hideArrow, ...props }: any) => (
    <div data-slot="tooltip-content" {...props}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children, open, onOpenChange }: any) => (
    <div data-slot="popover" data-open={open} onClick={() => onOpenChange?.(true)}>
      {children}
    </div>
  ),
  PopoverTrigger: ({ children, ...props }: any) => (
    <button
      type="button"
      data-slot="popover-trigger"
      data-testid="popover-trigger"
      {...props}
    >
      {children}
    </button>
  ),
  PopoverContent: ({ children, ...props }: any) => (
    <div data-slot="popover-content" {...props}>
      {children}
    </div>
  ),
  PopoverAnchor: ({ children, ...props }: any) => (
    <div data-slot="popover-anchor" {...props}>
      {children}
    </div>
  ),
}));

vi.mock("@/hooks/use-is-coarse-pointer", async () => {
  let value: boolean | null = null;
  return {
    useIsCoarsePointer: () => value,
    __setIsCoarsePointer: (v: boolean | null) => {
      value = v;
    },
  };
});

const { __setIsCoarsePointer } = await import("@/hooks/use-is-coarse-pointer");

describe("HybridTooltipPopover", () => {
  beforeEach(() => {
    __setIsCoarsePointer(null);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forces tooltip mode when specified", () => {
    __setIsCoarsePointer(true);
    render(
      <HybridTooltipPopover forceMode="tooltip">
        <HybridTooltipPopoverTrigger>trigger</HybridTooltipPopoverTrigger>
        <HybridTooltipPopoverContent>content</HybridTooltipPopoverContent>
      </HybridTooltipPopover>
    );
    expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
    expect(screen.queryByTestId("popover-trigger")).not.toBeInTheDocument();
  });

  it("forces popover mode when specified", () => {
    __setIsCoarsePointer(false);
    render(
      <HybridTooltipPopover forceMode="popover">
        <HybridTooltipPopoverTrigger>trigger</HybridTooltipPopoverTrigger>
        <HybridTooltipPopoverContent>content</HybridTooltipPopoverContent>
      </HybridTooltipPopover>
    );
    expect(screen.getByTestId("popover-trigger")).toBeInTheDocument();
    expect(screen.queryByTestId("tooltip-trigger")).not.toBeInTheDocument();
  });

  it("uses tooltip mode for fine pointers", () => {
    __setIsCoarsePointer(false);
    render(
      <HybridTooltipPopover>
        <HybridTooltipPopoverTrigger>trigger</HybridTooltipPopoverTrigger>
        <HybridTooltipPopoverContent>content</HybridTooltipPopoverContent>
      </HybridTooltipPopover>
    );
    expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
  });

  it("uses popover mode for coarse pointers", () => {
    __setIsCoarsePointer(true);
    render(
      <HybridTooltipPopover>
        <HybridTooltipPopoverTrigger>trigger</HybridTooltipPopoverTrigger>
        <HybridTooltipPopoverContent>content</HybridTooltipPopoverContent>
      </HybridTooltipPopover>
    );
    expect(screen.getByTestId("popover-trigger")).toBeInTheDocument();
  });

  it("propagates open state changes", () => {
    __setIsCoarsePointer(true);
    const onOpenChange = vi.fn();
    render(
      <HybridTooltipPopover open={false} onOpenChange={onOpenChange}>
        <HybridTooltipPopoverTrigger>trigger</HybridTooltipPopoverTrigger>
        <HybridTooltipPopoverContent>content</HybridTooltipPopoverContent>
      </HybridTooltipPopover>
    );
    fireEvent.click(screen.getByText("trigger"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
