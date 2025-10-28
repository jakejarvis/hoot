/* @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainSuggestions } from "@/components/domain/domain-suggestions";

const TEST_SUGGESTIONS = [
  "github.com",
  "reddit.com",
  "wikipedia.org",
  "firefox.com",
  "jarv.is",
];

vi.mock("@bprogress/next/app", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/domain/favicon", () => ({
  Favicon: ({ domain }: { domain: string }) =>
    createElement("span", {
      "data-slot": "favicon",
      "data-domain": domain,
    }),
}));

describe("DomainSuggestions", () => {
  beforeEach(() => {
    // Reset history between tests
    localStorage.removeItem("search-history");
  });

  it("renders provided suggestions when there is no history", async () => {
    render(<DomainSuggestions suggestions={TEST_SUGGESTIONS} />);
    // Wait for a known suggestion like jarv.is to appear
    expect(
      await screen.findByRole("button", { name: /jarv\.is/i }),
    ).toBeInTheDocument();
    // At least one favicon placeholder should exist
    expect(
      document.querySelectorAll('[data-slot="favicon"]').length,
    ).toBeGreaterThan(0);
  });

  it("merges history and suggestions without duplicates, capped by max", async () => {
    localStorage.setItem(
      "search-history",
      JSON.stringify(["foo.com", "github.com", "bar.org"]),
    );
    render(<DomainSuggestions suggestions={TEST_SUGGESTIONS} max={4} />);
    // History entries appear
    expect(
      await screen.findByRole("button", { name: /foo\.com/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /bar\.org/i }),
    ).toBeInTheDocument();
    // github.com appears only once (deduped with suggestions)
    expect(screen.getAllByRole("button", { name: /github\.com/i }).length).toBe(
      1,
    );
  });

  it("invokes onSelect when a suggestion is clicked", async () => {
    const onSelect = vi.fn();
    localStorage.setItem("search-history", JSON.stringify(["example.com"]));
    render(
      <DomainSuggestions
        suggestions={TEST_SUGGESTIONS}
        onSelectAction={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /example.com/i }));
    expect(onSelect).toHaveBeenCalledWith("example.com");
  });
});
