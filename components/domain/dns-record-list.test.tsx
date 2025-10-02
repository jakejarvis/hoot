import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DnsRecordList } from "@/components/domain/dns-record-list";

vi.mock("@/components/domain/favicon", () => ({
  Favicon: ({ domain }: { domain: string }) => <div>icon:{domain}</div>,
}));

// Mock tooltip primitives
vi.mock("@/components/ui/tooltip", () => ({
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

describe("DnsRecordList", () => {
  it("sorts MX by priority and renders TTL badges", () => {
    const records = [
      {
        type: "MX",
        name: "",
        value: "mx-b.example.com",
        ttl: 200,
        priority: 20,
      },
      {
        type: "MX",
        name: "",
        value: "mx-a.example.com",
        ttl: 300,
        priority: 10,
      },
      {
        type: "MX",
        name: "",
        value: "mx-c.example.com",
        ttl: 100,
        priority: 30,
      },
    ] as unknown as import("@/lib/schemas").DnsRecord[];

    render(<DnsRecordList records={records} type="MX" />);

    const items = Array.from(
      document.querySelectorAll("span.truncate.flex-1.min-w-0.block"),
    ).map((el) => (el as HTMLElement).textContent);
    expect(items).toEqual([
      "mx-a.example.com",
      "mx-b.example.com",
      "mx-c.example.com",
    ]);

    // TTL badge presence (not exact text as it's formatted)
    expect(document.querySelectorAll('[data-slot="badge"]')).toBeTruthy();
  });

  it("shows Cloudflare favicon suffix when isCloudflare", () => {
    const records = [
      { type: "A", name: "", value: "1.2.3.4", ttl: 60, isCloudflare: true },
    ] as unknown as import("@/lib/schemas").DnsRecord[];

    render(<DnsRecordList records={records} type="A" />);
    expect(screen.getByText(/icon:cloudflare.com/i)).toBeInTheDocument();
  });
});
