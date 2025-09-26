import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { HostingEmailSection } from "./hosting-email-section";

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

vi.mock("next/dynamic", () => ({
  __esModule: true,
  // biome-ignore lint/suspicious/noExplicitAny: fine for this test
  default: (_loader: any, _opts: any) => {
    // return a dummy component to avoid map rendering
    return () => <div data-slot="hosting-map" />;
  },
}));

vi.mock("@/components/domain/favicon", () => ({
  Favicon: ({ domain }: { domain: string }) => <div>icon:{domain}</div>,
}));

describe("HostingEmailSection", () => {
  it("renders provider names and icons", () => {
    const data = {
      dnsProvider: { name: "Cloudflare", domain: "cloudflare.com" },
      hostingProvider: { name: "Vercel", domain: "vercel.com" },
      emailProvider: { name: "Google Workspace", domain: "google.com" },
      ipAddress: "1.2.3.4",
      geo: {
        city: "",
        region: "",
        country: "",
        lat: null,
        lon: null,
        emoji: null,
      },
    } as unknown as import("@/server/services/hosting").HostingInfo;
    render(
      <HostingEmailSection
        data={data}
        isLoading={false}
        isError={false}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText("Cloudflare")).toBeInTheDocument();
    expect(screen.getByText(/icon:cloudflare.com/)).toBeInTheDocument();
    expect(screen.getByText("Vercel")).toBeInTheDocument();
    expect(screen.getByText("Google Workspace")).toBeInTheDocument();
  });

  it("shows error and loading states", () => {
    render(
      <HostingEmailSection
        data={null}
        isLoading={false}
        isError
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText(/Failed to load hosting/i)).toBeInTheDocument();

    render(
      <HostingEmailSection
        data={null}
        isLoading
        isError={false}
        onRetry={() => {}}
      />,
    );
    expect(screen.getAllByText("Hosting & Email").length).toBeGreaterThan(0);
  });
});
