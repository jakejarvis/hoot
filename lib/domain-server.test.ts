/* @vitest-environment node */
import { describe, expect, it } from "vitest";
import { toRegistrableDomain } from "./domain-server";

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

  it("is non-null only for ICANN eTLD+1 inputs", () => {
    expect(toRegistrableDomain("sub.EXAMPLE.com")).toBe("example.com");
    expect(toRegistrableDomain("localhost")).toBeNull();
    expect(toRegistrableDomain("256.256.256.256")).toBeNull();
  });

  it("is null for common sourcemap-like suffixes", () => {
    expect(toRegistrableDomain("styles.css.map")).toBeNull();
    expect(toRegistrableDomain("app.js.map")).toBeNull();
    expect(toRegistrableDomain("foo.ts.map")).toBeNull();
    expect(toRegistrableDomain("bundle.mjs.map")).toBeNull();
    expect(toRegistrableDomain("bundle.cjs.map")).toBeNull();
    expect(toRegistrableDomain("file.css")).toBeNull();
  });

  it("is non-null for normal domains and non-sourcemap assets", () => {
    expect(toRegistrableDomain("example.com")).toBe("example.com");
    expect(toRegistrableDomain("example.org")).toBe("example.org");
    expect(toRegistrableDomain("file.map")).toBe("file.map");
  });
});
