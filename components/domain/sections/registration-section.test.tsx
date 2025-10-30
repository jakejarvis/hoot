/* @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatRegistrant, RegistrationSection } from "./registration-section";

vi.mock("@/components/domain/favicon", () => ({
  Favicon: ({ domain }: { domain: string }) => <div>favicon:{domain}</div>,
}));

// Keep TooltipContent empty in unit tests to avoid text duplication issues.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="tooltip">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button" data-slot="tooltip-trigger">
      {children}
    </button>
  ),
  TooltipContent: (_: { children: React.ReactNode }) => null,
}));

describe("RegistrationSection", () => {
  it("renders registrar, dates, and registrant when data present", () => {
    const record = {
      source: "rdap",
      registrar: { name: "GoDaddy", url: "https://godaddy.com" },
      creationDate: "2024-01-01T00:00:00.000Z",
      expirationDate: "2026-01-01T00:00:00.000Z",
      contacts: [
        {
          type: "registrant",
          organization: "Acme Inc",
          country: "US",
          state: "CA",
        },
      ],
    } as unknown as import("@/lib/schemas").Registration;

    render(
      <RegistrationSection
        data={
          {
            ...record,
            registrarProvider: { name: "GoDaddy", domain: "godaddy.com" },
          } as unknown as import("@/lib/schemas").Registration
        }
        isLoading={false}
        isError={false}
        onRetryAction={() => {}}
      />,
    );

    expect(screen.getByText("Registrar")).toBeInTheDocument();
    // TooltipTrigger wraps the text; assert via getAllByText to avoid ambiguity
    expect(screen.getAllByText("GoDaddy").length).toBeGreaterThan(0);
    expect(screen.getByText(/favicon:godaddy.com/i)).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("Expires")).toBeInTheDocument();
    expect(screen.getByText("Registrant")).toBeInTheDocument();
    expect(screen.getByText(/Acme Inc/)).toBeInTheDocument();
  });

  it("renders error state with retry when isError", () => {
    render(
      <RegistrationSection
        data={null}
        isLoading={false}
        isError
        onRetryAction={() => {}}
      />,
    );
    expect(screen.getByText(/Failed to load WHOIS/i)).toBeInTheDocument();
  });

  it("renders skeletons when loading", () => {
    render(
      <RegistrationSection
        data={null}
        isLoading
        isError={false}
        onRetryAction={() => {}}
      />,
    );
    // skeletons are present via role none; just assert section title appears to ensure render
    expect(screen.getAllByText(/Registration/i).length).toBeGreaterThan(0);
  });

  it("renders unavailable message when WHOIS/RDAP is not available (source is null)", () => {
    const record = {
      domain: "whois.ls",
      tld: "ls",
      isRegistered: false,
      source: null, // WHOIS/RDAP unavailable
      registrarProvider: { name: null, domain: null },
    } as unknown as import("@/lib/schemas").Registration;

    render(
      <RegistrationSection
        data={record}
        isLoading={false}
        isError={false}
        onRetryAction={() => {}}
      />,
    );

    expect(
      screen.getByText("Registration Data Unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/registry does not publish public WHOIS\/RDAP data/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/\.ls/)).toBeInTheDocument();
  });
});

describe("formatRegistrant", () => {
  it("returns Unavailable when empty", () => {
    expect(formatRegistrant({ organization: "", country: "", state: "" })).toBe(
      "Unavailable",
    );
  });

  it("joins org and location", () => {
    expect(
      formatRegistrant({ organization: "Acme", country: "US", state: "CA" }),
    ).toBe("Acme — CA, US");
  });
});
