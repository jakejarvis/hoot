/* @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeadersSection } from "./headers-section";

describe("HeadersSection", () => {
  it("highlights important headers and renders values", () => {
    const data = [
      { name: "strict-transport-security", value: "max-age=63072000" },
      { name: "server", value: "vercel" },
      { name: "x-powered-by", value: "nextjs" },
    ];
    render(
      <HeadersSection
        data={data}
        isLoading={false}
        isError={false}
        onRetryAction={() => {}}
      />,
    );
    expect(screen.getByText("strict-transport-security")).toBeInTheDocument();
    const values = screen.getAllByText("max-age=63072000");
    // pick the main value span (not tooltip content) by role absence
    expect(values.some((n) => n.tagName.toLowerCase() === "span")).toBe(true);
  });

  it("shows error state", () => {
    render(
      <HeadersSection
        data={null}
        isLoading={false}
        isError
        onRetryAction={() => {}}
      />,
    );
    expect(screen.getByText(/Failed to load headers/i)).toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    render(
      <HeadersSection
        data={null}
        isLoading
        isError={false}
        onRetryAction={() => {}}
      />,
    );
    expect(screen.getByText("HTTP Headers")).toBeInTheDocument();
  });
});
