import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Bookmarklet } from "@/components/bookmarklet";

describe("Bookmarklet", () => {
  it("opens dialog when clicking the trigger", async () => {
    render(<Bookmarklet />);
    await userEvent.click(
      screen.getByRole("button", { name: /open bookmarklet info/i }),
    );
    expect(
      screen.getByRole("heading", { name: /bookmarklet/i }),
    ).toBeInTheDocument();
  });

  it("sets Inspect Domain href to a javascript: url", async () => {
    render(<Bookmarklet />);
    await userEvent.click(
      screen.getByRole("button", { name: /open bookmarklet info/i }),
    );
    const link = screen.getByRole("link", { name: /inspect domain/i });
    expect(link.getAttribute("href")?.startsWith("javascript:")).toBe(true);
  });
});
