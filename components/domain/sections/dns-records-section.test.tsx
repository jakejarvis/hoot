import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { DnsRecordsSection } from "./dns-records-section";

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

vi.mock("@/components/domain/dns-group", () => ({
  DnsGroup: ({
    title,
    count,
    children,
  }: {
    title: string;
    count: number;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      <div>count:{count}</div>
      {children}
    </div>
  ),
}));

vi.mock("@/components/domain/dns-record-list", () => ({
  DnsRecordList: ({ type }: { type: string }) => <div>list:{type}</div>,
}));

describe("DnsRecordsSection", () => {
  it("renders groups for each type and passes counts", () => {
    const records = [
      { type: "A", name: "a", value: "1.2.3.4" },
      { type: "AAAA", name: "aaaa", value: "::1" },
      { type: "MX", name: "mx", value: "mx.example.com", priority: 10 },
      { type: "TXT", name: "txt", value: "v=spf1" },
      { type: "NS", name: "ns", value: "ns1.example.com" },
    ] as unknown as import("@/server/services/dns").DnsRecord[];

    render(
      <DnsRecordsSection
        records={records}
        isLoading={false}
        isError={false}
        onRetry={() => {}}
        showTtls={false}
        onToggleTtls={() => {}}
      />,
    );

    expect(screen.getByText("A Records")).toBeInTheDocument();
    const counts = screen.getAllByText("count:1");
    expect(counts.length).toBe(5);
    expect(screen.getByText("MX Records")).toBeInTheDocument();
  });

  it("shows error and loading states", () => {
    render(
      <DnsRecordsSection
        records={null}
        isLoading={false}
        isError
        onRetry={() => {}}
        showTtls={false}
        onToggleTtls={() => {}}
      />,
    );
    expect(screen.getByText(/Failed to load DNS/i)).toBeInTheDocument();

    render(
      <DnsRecordsSection
        records={null}
        isLoading
        isError={false}
        onRetry={() => {}}
        showTtls={false}
        onToggleTtls={() => {}}
      />,
    );
    expect(screen.getAllByText("DNS Records").length).toBeGreaterThan(0);
  });
});
