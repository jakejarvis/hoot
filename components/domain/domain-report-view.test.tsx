/* @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DomainReportView } from "./domain-report-view";

// Mock all required modules
vi.mock("@/lib/analytics/client", () => ({
  captureClient: vi.fn(),
}));

vi.mock("@/lib/json-export", () => ({
  exportDomainData: vi.fn(),
}));

vi.mock("@/lib/trpc/client", () => ({
  useTRPC: () => ({
    domain: {
      registration: {
        queryOptions: (input: { domain: string }) => ({
          queryKey: ["registration", input],
        }),
      },
      dns: {
        queryOptions: (input: { domain: string }) => ({
          queryKey: ["dns", input],
        }),
      },
      hosting: {
        queryOptions: (input: { domain: string }) => ({
          queryKey: ["hosting", input],
        }),
      },
      certificates: {
        queryOptions: (input: { domain: string }) => ({
          queryKey: ["certificates", input],
        }),
      },
      headers: {
        queryOptions: (input: { domain: string }) => ({
          queryKey: ["headers", input],
        }),
      },
      seo: {
        queryOptions: (input: { domain: string }) => ({
          queryKey: ["seo", input],
        }),
      },
    },
  }),
}));

vi.mock("@/hooks/use-domain-queries", () => ({
  useRegistrationQuery: () => ({
    data: {
      isRegistered: true,
      domain: "example.com",
      source: "rdap",
    },
  }),
}));

vi.mock("@/hooks/use-domain-history", () => ({
  useDomainHistory: vi.fn(),
}));

vi.mock("@/components/domain/domain-unregistered-state", () => ({
  DomainUnregisteredState: () => <div>Unregistered</div>,
}));

vi.mock("@/components/domain/export-button", () => ({
  ExportButton: ({
    onExportAction,
    disabled,
  }: {
    onExportAction: () => void;
    disabled: boolean;
  }) => (
    <button type="button" onClick={onExportAction} disabled={disabled}>
      Export
    </button>
  ),
}));

vi.mock("@/components/domain/favicon", () => ({
  Favicon: () => <div>Favicon</div>,
}));

vi.mock("@/components/domain/screenshot-tooltip", () => ({
  ScreenshotTooltip: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/domain/tools-dropdown", () => ({
  ToolsDropdown: () => <div>Tools</div>,
}));

vi.mock(
  "@/components/domain/sections-with-data/registration-section-with-data",
  () => ({
    RegistrationSectionWithData: () => <div>Registration</div>,
  }),
);

vi.mock(
  "@/components/domain/sections-with-data/hosting-section-with-data",
  () => ({
    HostingSectionWithData: () => <div>Hosting</div>,
  }),
);

vi.mock("@/components/domain/sections-with-data/dns-section-with-data", () => ({
  DnsSectionWithData: () => <div>DNS</div>,
}));

vi.mock(
  "@/components/domain/sections-with-data/certificates-section-with-data",
  () => ({
    CertificatesSectionWithData: () => <div>Certificates</div>,
  }),
);

vi.mock(
  "@/components/domain/sections-with-data/headers-section-with-data",
  () => ({
    HeadersSectionWithData: () => <div>Headers</div>,
  }),
);

vi.mock("@/components/domain/sections-with-data/seo-section-with-data", () => ({
  SeoSectionWithData: () => <div>SEO</div>,
}));

describe("DomainReportView Export", () => {
  it("calls exportDomainData with cached query data when Export button is clicked", async () => {
    const { exportDomainData } = await import("@/lib/json-export");
    const { captureClient } = await import("@/lib/analytics/client");

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Number.POSITIVE_INFINITY,
        },
      },
    });

    // Pre-populate cache with test data
    const domain = "example.com";
    queryClient.setQueryData(["registration", { domain }], {
      isRegistered: true,
      domain: "example.com",
    });
    queryClient.setQueryData(["dns", { domain }], { records: [] });
    queryClient.setQueryData(["hosting", { domain }], { provider: "test" });
    queryClient.setQueryData(["certificates", { domain }], []);
    queryClient.setQueryData(["headers", { domain }], []);
    queryClient.setQueryData(["seo", { domain }], { title: "Test" });

    render(
      <QueryClientProvider client={queryClient}>
        <DomainReportView domain={domain} />
      </QueryClientProvider>,
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText("example.com")).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByText("Export");
    await userEvent.click(exportButton);

    // Verify analytics was captured
    expect(captureClient).toHaveBeenCalledWith("export_json_clicked", {
      domain,
    });

    // Verify exportDomainData was called with aggregated data
    expect(exportDomainData).toHaveBeenCalledWith(domain, {
      registration: { isRegistered: true, domain: "example.com" },
      dns: { records: [] },
      hosting: { provider: "test" },
      certificates: [],
      headers: [],
      seo: { title: "Test" },
    });
  });
});
