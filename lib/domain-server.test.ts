/* @vitest-environment node */
import { describe, expect, it } from "vitest";
import { isAcceptableDomainInput, toRegistrableDomain } from "./domain-server";

describe("toRegistrableDomain", () => {
  it("reduces subdomains to eTLD+1", () => {
    expect(toRegistrableDomain("www.foo.bar.example.co.uk")).toBe(
      "example.co.uk",
    );
  });

  it("rejects IPs and non-ICANN suffixes", () => {
    expect(toRegistrableDomain("127.0.0.1")).toBeNull();
    expect(toRegistrableDomain("example.local")).toBeNull();
  });

  it("normalizes case and trailing dot", () => {
    expect(toRegistrableDomain("EXAMPLE.COM.")).toBe("example.com");
  });
});

describe("isAcceptableDomainInput", () => {
  it("is true only for ICANN eTLD+1 inputs", () => {
    expect(isAcceptableDomainInput("sub.EXAMPLE.com")).toBe(true);
    expect(isAcceptableDomainInput("localhost")).toBe(false);
    expect(isAcceptableDomainInput("256.256.256.256")).toBe(false);
  });
});
