import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeaderSearch } from "./header-search";

const nav = vi.hoisted(() => ({
  push: vi.fn(),
  params: { domain: "Example.COM" as string | undefined },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push }),
  useParams: () => nav.params,
}));

describe("HeaderSearch", () => {
  beforeEach(() => {
    nav.push.mockClear();
  });

  it("prefills normalized domain from params and navigates on Enter", async () => {
    nav.params = { domain: "Sub.Example.COM" };
    render(<HeaderSearch />);
    const input = screen.getByLabelText(/Search domains/i);
    expect(input).toHaveValue("sub.example.com");
    await userEvent.type(input, "{Enter}");
    expect(nav.push).toHaveBeenCalledWith("/sub.example.com");
  });

  it("does nothing on invalid domain", async () => {
    nav.params = { domain: "invalid domain" } as { domain: string };
    render(<HeaderSearch />);
    const input = screen.getByLabelText(/Search domains/i);
    await userEvent.type(input, "{Enter}");
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("has mobile-friendly input attributes", () => {
    nav.params = {};
    render(<HeaderSearch />);
    const input = screen.getByLabelText(/Search domains/i);
    
    expect(input).toHaveAttribute("inputMode", "search");
    expect(input).toHaveAttribute("autoComplete", "off");
    expect(input).toHaveAttribute("autoCorrect", "off");
    expect(input).toHaveAttribute("autoCapitalize", "none");
    expect(input).toHaveAttribute("spellCheck", "false");
  });
});
