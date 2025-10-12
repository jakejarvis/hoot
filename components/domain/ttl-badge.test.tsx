/* @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TtlBadge } from "./ttl-badge";

vi.mock("@/components/ui/tooltip", () => ({
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

describe("TtlBadge", () => {
  it("renders formatted ttl and raw ttl in tooltip", () => {
    render(<TtlBadge ttl={3660} />);
    expect(screen.getByText("1h 1m")).toBeInTheDocument();
    expect(screen.getByText("3660")).toBeInTheDocument();
  });
});
