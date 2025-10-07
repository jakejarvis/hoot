import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CertificatesSection, equalHostname } from "./certificates-section";

// Mock tooltip
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tooltip-provider">{children}</div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tooltip">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tooltip-content">{children}</div>
  ),
}));

vi.mock("@/components/domain/favicon", () => ({
  Favicon: ({ domain }: { domain: string }) => (
    <div data-slot="favicon" data-domain={domain} />
  ),
}));

describe("CertificatesSection", () => {
  it("renders certificate fields and SAN count tooltip", () => {
    const data = [
      {
        issuer: "Let's Encrypt",
        subject: "example.com",
        altNames: ["*.example.com", "example.com"],
        validFrom: "2024-01-01T00:00:00.000Z",
        validTo: "2025-01-01T00:00:00.000Z",
        caProvider: { name: "Let's Encrypt", domain: "letsencrypt.org" },
      },
    ];
    render(
      <CertificatesSection
        data={data}
        isLoading={false}
        isError={false}
        onRetryAction={() => {}}
      />,
    );
    expect(screen.getByText("Issuer")).toBeInTheDocument();
    expect(
      screen
        .getAllByText("Let's Encrypt")
        .some((n) => n.tagName.toLowerCase() === "span"),
    ).toBe(true);
    expect(screen.getByText("Subject")).toBeInTheDocument();
    expect(
      screen
        .getAllByText("example.com")
        .some((n) => n.tagName.toLowerCase() === "span"),
    ).toBe(true);
    // SAN count excludes subject-equal altName; badge appears twice (raw + wrapped by trigger)
    const sanBadges = screen.getAllByText(
      (_, element) => (element?.textContent || "").replace(/\s+/g, "") === "+1",
    );
    expect(sanBadges.length).toBeGreaterThan(0);
    // shows CA annotation (may appear in value, tooltip, and suffix)
    expect(screen.getAllByText("Let's Encrypt").length).toBeGreaterThan(0);
    // shows CA favicon for issuer
    expect(
      document.querySelector(
        '[data-slot="favicon"][data-domain="letsencrypt.org"]',
      ),
    ).not.toBeNull();
  });

  it("shows error state", () => {
    render(
      <CertificatesSection
        data={null}
        isLoading={false}
        isError
        onRetryAction={() => {}}
      />,
    );
    expect(
      screen.getByText(/Failed to load certificates/i),
    ).toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    render(
      <CertificatesSection
        data={null}
        isLoading
        isError={false}
        onRetryAction={() => {}}
      />,
    );
    expect(screen.getByText("SSL Certificates")).toBeInTheDocument();
  });
});

describe("equalHostname", () => {
  it("ignores case and whitespace", () => {
    expect(equalHostname(" ExAmple.COM ", "example.com")).toBe(true);
  });
});
