/* @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeyValue } from "./key-value";

vi.mock("@/components/domain/copy-button", () => ({
  CopyButton: ({ value }: { value: string }) => (
    <button type="button" onClick={() => navigator.clipboard.writeText(value)}>
      Copy
    </button>
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

beforeEach(() => {
  // @ts-expect-error minimal stub
  navigator.clipboard = { writeText: vi.fn(async () => undefined) };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("KeyValue", () => {
  it("renders label/value and copies when copyable", async () => {
    render(<KeyValue label="Registrar" value="Namecheap" copyable />);
    expect(screen.getByText("Registrar")).toBeInTheDocument();
    expect(screen.getAllByText("Namecheap")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Namecheap");
  });

  it("renders without copy button when not copyable", () => {
    render(<KeyValue label="Registrar" value="NameCheap" />);
    expect(screen.getByText("Registrar")).toBeInTheDocument();
    expect(screen.getAllByText("NameCheap")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /copy/i })).toBeNull();
  });
});

describe("KeyValue tooltip", () => {
  it("renders custom tooltip content when provided", async () => {
    const { KeyValue } = await import("./key-value");
    render(
      <KeyValue
        label="Valid from"
        value="Oct. 2, 2025"
        valueTooltip="2025-10-02 00:00:00 UTC"
      />,
    );
    expect(screen.getByText("Oct. 2, 2025")).toBeInTheDocument();
    expect(screen.getByText("2025-10-02 00:00:00 UTC")).toBeInTheDocument();
  });
});
