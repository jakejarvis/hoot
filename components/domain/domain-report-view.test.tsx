import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DomainReportView } from "./domain-report-view";

// Mock Accordion to avoid Radix provider
vi.mock("@/components/ui/accordion", () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="accordion">{children}</div>
  ),
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

vi.mock("./favicon", () => ({
  Favicon: ({ domain }: { domain: string }) => <div>icon:{domain}</div>,
}));

// Mock hooks for queries/history/preferences
vi.mock("../../hooks/use-domain-queries", () => ({
  useDomainQueries: () => ({
    registration: {
      isLoading: false,
      isSuccess: true,
      data: { isRegistered: true },
    },
    dns: {
      isLoading: false,
      data: { records: [] },
      isError: false,
      refetch: vi.fn(),
    },
    hosting: {
      isLoading: false,
      data: {
        dnsProvider: { name: "Cloudflare", domain: "cloudflare.com" },
        hostingProvider: { name: "Vercel", domain: "vercel.com" },
        emailProvider: { name: "Google Workspace", domain: "google.com" },
        ipAddress: null,
        geo: {
          city: "",
          region: "",
          country: "",
          lat: null,
          lon: null,
          emoji: null,
        },
      },
      isError: false,
      refetch: vi.fn(),
    },
    certs: { isLoading: false, data: [], isError: false, refetch: vi.fn() },
    headers: { isLoading: false, data: [], isError: false, refetch: vi.fn() },
    allSectionsReady: true,
  }),
}));

vi.mock("../../hooks/use-ttl-preferences", () => ({
  useTtlPreferences: () => ({ showTtls: true, setShowTtls: vi.fn() }),
}));

vi.mock("../../hooks/use-domain-history", () => ({
  useDomainHistory: vi.fn(),
}));

describe("DomainReportView", () => {
  it("renders heading and sections with ready data", () => {
    render(<DomainReportView domain="example.com" />);
    expect(screen.getByText("example.com")).toBeInTheDocument();
    // Section titles exist (match exact main titles to avoid label collisions)
    expect(screen.getByText("Registration")).toBeInTheDocument();
    expect(screen.getByText("Hosting & Email")).toBeInTheDocument();
    expect(screen.getByText("DNS Records")).toBeInTheDocument();
    expect(screen.getByText("SSL Certificates")).toBeInTheDocument();
    expect(screen.getByText("HTTP Headers")).toBeInTheDocument();
  });
});
