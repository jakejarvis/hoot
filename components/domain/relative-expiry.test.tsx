/* @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RelativeExpiry } from "./relative-expiry";

describe("RelativeExpiry", () => {
  it("renders warn color for dates within warn threshold", async () => {
    const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
    const date = new Date(Date.now() + tenDaysMs).toISOString();
    render(<RelativeExpiry to={date} dangerDays={7} warnDays={30} />);

    await waitFor(() => {
      const els = screen.getAllByText((_, node) => {
        const t = node?.textContent || "";
        return t.startsWith("(") && t.endsWith(")") && /in\s+/i.test(t);
      });
      expect(els.length).toBeGreaterThan(0);
      expect(els.some((e) => e.className.includes("text-amber-600"))).toBe(
        true,
      );
    });
  });

  it("renders danger color for dates within danger threshold", async () => {
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const date = new Date(Date.now() + threeDaysMs).toISOString();
    render(<RelativeExpiry to={date} dangerDays={7} warnDays={30} />);

    await waitFor(() => {
      const els = screen.getAllByText((_, node) => {
        const t = node?.textContent || "";
        return t.startsWith("(") && t.endsWith(")") && /in\s+/i.test(t);
      });
      expect(els.length).toBeGreaterThan(0);
      expect(els.some((e) => e.className.includes("text-red-600"))).toBe(true);
    });
  });

  it("shows past dates as ago and uses danger color", async () => {
    const pastMs = -2 * 24 * 60 * 60 * 1000;
    const date = new Date(Date.now() + pastMs).toISOString();
    render(<RelativeExpiry to={date} />);

    await waitFor(() => {
      const els = screen.getAllByText((_, node) => {
        const t = node?.textContent || "";
        return t.startsWith("(") && t.endsWith(")") && /ago\)/i.test(t);
      });
      expect(els.length).toBeGreaterThan(0);
      expect(els.some((e) => e.className.includes("text-red-600"))).toBe(true);
    });
  });
});
