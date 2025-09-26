import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { CertificatesSection } from "./certificates-section";

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

// Mock Accordion bits used by Section
vi.mock("@/components/ui/accordion", () => ({
  AccordionItem: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="accordion-item">{children}</div>
  ),
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button" data-slot="accordion-trigger">
      {children}
    </button>
  ),
  AccordionContent: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="accordion-content">{children}</div>
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
      },
    ];
    render(
      <CertificatesSection
        data={data}
        isLoading={false}
        isError={false}
        onRetry={() => {}}
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
    // SAN count excludes subject equal altName
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("shows error state", () => {
    render(
      <CertificatesSection
        data={null}
        isLoading={false}
        isError
        onRetry={() => {}}
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
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText("SSL Certificates")).toBeInTheDocument();
  });
});
