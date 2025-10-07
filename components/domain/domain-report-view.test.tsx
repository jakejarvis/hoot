import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DomainReportView } from "@/components/domain/domain-report-view";

vi.mock("@/components/domain/favicon", () => ({
  Favicon: ({ domain }: { domain: string }) => <div>icon:{domain}</div>,
}));

// Mock hooks for queries/history with an overridable return value
type DomainQueriesMock = {
  registration: {
    isLoading: boolean;
    isSuccess?: boolean;
    data?: { isRegistered?: boolean } | null;
  };
  dns: {
    isLoading: boolean;
    isFetching?: boolean;
    data?: { records?: unknown[] } | null | undefined;
    isError?: boolean;
    refetch: () => void;
  };
  hosting: {
    isLoading: boolean;
    isFetching?: boolean;
    data?: unknown;
    isError?: boolean;
    refetch: () => void;
  };
  certs: {
    isLoading: boolean;
    isFetching?: boolean;
    data?: unknown;
    isError?: boolean;
    refetch: () => void;
  };
  headers: {
    isLoading: boolean;
    isFetching?: boolean;
    data?: unknown;
    isError?: boolean;
    refetch: () => void;
  };
  seo: {
    isLoading: boolean;
    isFetching?: boolean;
    data?: unknown;
    isError?: boolean;
    refetch: () => void;
  };
};
let mockQueries: DomainQueriesMock;
vi.mock("@/hooks/use-domain-queries", () => ({
  useDomainQueries: () => mockQueries,
}));

vi.mock("@/hooks/use-domain-history", () => ({
  useDomainHistory: vi.fn(),
}));

describe("DomainReportView", () => {
  it("renders heading and sections with ready data", () => {
    mockQueries = {
      registration: {
        isLoading: false,
        isSuccess: true,
        data: { isRegistered: true },
      },
      dns: {
        isLoading: false,
        isFetching: false,
        data: { records: [] },
        isError: false,
        refetch: vi.fn(),
      },
      hosting: {
        isLoading: false,
        isFetching: false,
        data: {
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
        },
        isError: false,
        refetch: vi.fn(),
      },
      certs: {
        isLoading: false,
        isFetching: false,
        data: [],
        isError: false,
        refetch: vi.fn(),
      },
      headers: {
        isLoading: false,
        isFetching: false,
        data: [],
        isError: false,
        refetch: vi.fn(),
      },
      seo: {
        isLoading: false,
        isFetching: false,
        data: null,
        isError: false,
        refetch: vi.fn(),
      },
    };
    render(<DomainReportView domain="example.com" />);
    expect(screen.getByText("example.com")).toBeInTheDocument();
    // Section titles exist (match exact main titles to avoid label collisions)
    expect(screen.getByText("Registration")).toBeInTheDocument();
    expect(screen.getByText("Hosting & Email")).toBeInTheDocument();
    expect(screen.getByText("DNS Records")).toBeInTheDocument();
    expect(screen.getByText("SSL Certificates")).toBeInTheDocument();
    expect(screen.getByText("HTTP Headers")).toBeInTheDocument();
    // Export button enabled when all sections are settled
    const exportBtn = screen.getByRole("button", { name: /Export/i });
    expect(exportBtn).not.toBeDisabled();
  });

  it("disables Export JSON while any section is loading", () => {
    mockQueries = {
      registration: {
        isLoading: false,
        isSuccess: true,
        data: { isRegistered: true },
      },
      dns: {
        isLoading: true,
        isFetching: false,
        data: undefined,
        isError: false,
        refetch: vi.fn(),
      },
      hosting: {
        isLoading: false,
        isFetching: false,
        data: null,
        isError: false,
        refetch: vi.fn(),
      },
      certs: {
        isLoading: false,
        isFetching: false,
        data: [],
        isError: false,
        refetch: vi.fn(),
      },
      headers: {
        isLoading: false,
        isFetching: false,
        data: [],
        isError: false,
        refetch: vi.fn(),
      },
      seo: {
        isLoading: false,
        isFetching: false,
        data: null,
        isError: false,
        refetch: vi.fn(),
      },
    };
    render(<DomainReportView domain="loading.com" />);
    const exportBtn = screen.getByRole("button", { name: /Export/i });
    expect(exportBtn).toBeDisabled();
  });

  it("enables Export JSON when all sections settled even if some errored", () => {
    mockQueries = {
      registration: {
        isLoading: false,
        isSuccess: true,
        data: { isRegistered: true },
      },
      dns: {
        isLoading: false,
        isFetching: false,
        data: undefined,
        isError: true,
        refetch: vi.fn(),
      },
      hosting: {
        isLoading: false,
        isFetching: false,
        data: null,
        isError: true,
        refetch: vi.fn(),
      },
      certs: {
        isLoading: false,
        isFetching: false,
        data: [],
        isError: false,
        refetch: vi.fn(),
      },
      headers: {
        isLoading: false,
        isFetching: false,
        data: [],
        isError: false,
        refetch: vi.fn(),
      },
      seo: {
        isLoading: false,
        isFetching: false,
        data: null,
        isError: false,
        refetch: vi.fn(),
      },
    };
    render(<DomainReportView domain="errors.com" />);
    const exportBtn = screen.getByRole("button", { name: /Export/i });
    expect(exportBtn).not.toBeDisabled();
  });
});
