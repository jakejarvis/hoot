import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorWithRetry } from "./error-with-retry";

describe("ErrorWithRetry", () => {
  it("calls onRetry when clicking Retry", async () => {
    const onRetry = vi.fn();
    render(<ErrorWithRetry message="Failed" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
