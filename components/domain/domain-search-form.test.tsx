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
});
