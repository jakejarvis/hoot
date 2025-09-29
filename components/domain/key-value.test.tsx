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
    expect(screen.getByText("Namecheap")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Namecheap");
  });

  it("renders without copy button when not copyable", () => {
    render(<KeyValue label="Registrar" value="NameCheap" />);
    expect(screen.getByText("Registrar")).toBeInTheDocument();
    expect(screen.getByText("NameCheap")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy/i })).toBeNull();
  });
});
