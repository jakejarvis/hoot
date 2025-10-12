/* @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HostingEmailSection } from "./hosting-email-section";

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
      geo: {
        city: "",
        region: "",
        country: "",
        lat: null,
        lon: null,
        emoji: null,
      },
    } as unknown as import("@/lib/schemas").Hosting;
    render(
      <HostingEmailSection
        data={data}
        isLoading={false}
        isError={false}
        onRetryAction={() => {}}
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
        onRetryAction={() => {}}
      />,
    );
    expect(screen.getByText(/Failed to load hosting/i)).toBeInTheDocument();

    render(
      <HostingEmailSection
        data={null}
        isLoading
        isError={false}
        onRetryAction={() => {}}
      />,
    );
    expect(screen.getAllByText("Hosting & Email").length).toBeGreaterThan(0);
  });
});
