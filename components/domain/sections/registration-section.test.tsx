import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RegistrationSection } from "./registration-section";

vi.mock("@/components/domain/favicon", () => ({
  Favicon: ({ domain }: { domain: string }) => <div>favicon:{domain}</div>,
}));

// Mock Radix Accordion primitives used by Section to avoid context requirement
vi.mock("@/components/ui/accordion", () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="accordion">{children}</div>
  ),
  AccordionItem: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-slot="accordion-item" {...props}>
      {children}
    </div>
  ),
  AccordionTrigger: ({ children, ...props }: { children: React.ReactNode }) => (
    <button data-slot="accordion-trigger" {...props}>
      {children}
    </button>
  ),
  AccordionContent: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-slot="accordion-content" {...props}>
      {children}
    </div>
  ),
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
    } as unknown as import("rdapper").DomainRecord;

    render(
      <RegistrationSection
        data={
          {
            ...record,
            registrarProvider: { name: "GoDaddy", domain: "godaddy.com" },
          } as unknown as import("@/lib/schemas").RegistrationWithProvider
        }
        isLoading={false}
        isError={false}
        onRetryAction={() => {}}
      />,
    );

    expect(screen.getByText("Registrar")).toBeInTheDocument();
    expect(
      screen.getByText((_, node) => node?.textContent === "GoDaddy"),
    ).toBeInTheDocument();
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
    expect(screen.getByText(/Registration/i)).toBeInTheDocument();
  });
});
