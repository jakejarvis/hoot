import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainSearch } from "./domain-search";

const nav = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push }),
  useParams: () => ({}),
}));

vi.mock("./domain-suggestions", () => ({
  DomainSuggestions: ({
    onSelectAction,
  }: {
    onSelectAction?: (domain: string) => void;
  }) => (
    <button type="button" onClick={() => onSelectAction?.("example.com")}>
      example.com
    </button>
  ),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

describe("DomainSearch (form variant)", () => {
  beforeEach(() => {
    nav.push.mockClear();
  });

  it("submits valid domain and navigates", async () => {
    render(<DomainSearch variant="lg" />);
    await userEvent.type(screen.getByPlaceholderText("hoot.sh"), "example.com");
    await userEvent.click(screen.getByRole("button", { name: /analyze/i }));
    expect(nav.push).toHaveBeenCalledWith("/example.com");
    // Input and button should be disabled while loading/submitting
    expect(
      (screen.getByPlaceholderText("hoot.sh") as HTMLInputElement).disabled,
    ).toBe(true);
    expect(screen.getByRole("button", { name: /analyze/i })).toBeDisabled();
  });

  it("shows error toast for invalid domain", async () => {
    const { toast } = (await import("sonner")) as unknown as {
      toast: { error: (msg: string) => void };
    };
    render(<DomainSearch variant="lg" />);
    await userEvent.type(
      screen.getByPlaceholderText("hoot.sh"),
      "not a domain",
    );
    await userEvent.click(screen.getByRole("button", { name: /analyze/i }));
    expect(toast.error).toHaveBeenCalled();
  });

  it("fills input and navigates when a suggestion is clicked", async () => {
    render(<DomainSearch variant="lg" />);
    // Click the mocked suggestion button
    await userEvent.click(
      screen.getByRole("button", { name: /example\.com/i }),
    );
    // Input should reflect the selected domain immediately
    const input = screen.getByPlaceholderText("hoot.sh") as HTMLInputElement;
    expect(input.value).toBe("example.com");
    // Navigation should have been triggered
    expect(nav.push).toHaveBeenCalledWith("/example.com");
    // Analyze button should be disabled (loading state)
    expect(screen.getByRole("button", { name: /analyze/i })).toBeDisabled();
    // Input should be disabled while loading
    expect(
      (screen.getByPlaceholderText("hoot.sh") as HTMLInputElement).disabled,
    ).toBe(true);
  });
});
