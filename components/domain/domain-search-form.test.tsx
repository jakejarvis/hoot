import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainSearchForm } from "./domain-search-form";

const nav = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

describe("DomainSearchForm", () => {
  beforeEach(() => {
    nav.push.mockClear();
  });

  it("submits valid domain and navigates", async () => {
    render(<DomainSearchForm showHistory={false} />);
    await userEvent.type(screen.getByPlaceholderText("hoot.sh"), "example.com");
    await userEvent.click(screen.getByRole("button", { name: /analyze/i }));
    expect(nav.push).toHaveBeenCalledWith("/example.com");
  });

  it("shows error toast for invalid domain", async () => {
    const { toast } = (await import("sonner")) as unknown as {
      toast: { error: (msg: string) => void };
    };
    render(<DomainSearchForm showHistory={false} />);
    await userEvent.type(
      screen.getByPlaceholderText("hoot.sh"),
      "not a domain",
    );
    await userEvent.click(screen.getByRole("button", { name: /analyze/i }));
    expect(toast.error).toHaveBeenCalled();
  });

  it("has mobile-friendly input attributes", () => {
    render(<DomainSearchForm showHistory={false} />);
    const input = screen.getByPlaceholderText("hoot.sh");
    
    expect(input).toHaveAttribute("inputMode", "search");
    expect(input).toHaveAttribute("autoComplete", "off");
    expect(input).toHaveAttribute("autoCorrect", "off");
    expect(input).toHaveAttribute("autoCapitalize", "none");
    expect(input).toHaveAttribute("spellCheck", "false");
  });

  it("shows real-time validation feedback", async () => {
    render(<DomainSearchForm showHistory={false} />);
    const input = screen.getByPlaceholderText("hoot.sh");
    
    // Initially should not show error
    expect(input).toHaveAttribute("aria-invalid", "false");
    
    // Type invalid domain and blur to trigger validation
    await userEvent.type(input, "invalid domain");
    await userEvent.tab(); // This triggers onBlur
    
    // Should now show validation error
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "domain-error");
  });
});
