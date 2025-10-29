/* @vitest-environment node */
import { describe, expect, it, vi } from "vitest";

// Mock the DB client to prevent DATABASE_URL requirement
vi.mock("@/lib/db/client", () => ({
  db: {},
}));

// Mock Redis to prevent connection attempts
vi.mock("@/lib/redis", () => ({
  redis: {},
  ns: (...parts: string[]) => parts.join(":"),
}));

import { getRegistrationCacheKey } from "./registrations";

describe("getRegistrationCacheKey", () => {
  it("normalizes domain to lowercase", () => {
    expect(getRegistrationCacheKey("EXAMPLE.COM")).toBe(
      getRegistrationCacheKey("example.com"),
    );
  });

  it("removes trailing dots", () => {
    expect(getRegistrationCacheKey("example.com.")).toBe(
      getRegistrationCacheKey("example.com"),
    );
    expect(getRegistrationCacheKey("example.com...")).toBe(
      getRegistrationCacheKey("example.com"),
    );
  });

  it("trims whitespace", () => {
    expect(getRegistrationCacheKey(" example.com ")).toBe(
      getRegistrationCacheKey("example.com"),
    );
    expect(getRegistrationCacheKey("  example.com  ")).toBe(
      getRegistrationCacheKey("example.com"),
    );
  });

  it("combines all normalization steps", () => {
    expect(getRegistrationCacheKey(" EXAMPLE.COM. ")).toBe(
      getRegistrationCacheKey("example.com"),
    );
    expect(getRegistrationCacheKey("  EXAMPLE.COM...  ")).toBe(
      getRegistrationCacheKey("example.com"),
    );
  });

  it("handles empty and undefined safely", () => {
    expect(getRegistrationCacheKey("")).toContain("reg:");
    expect(getRegistrationCacheKey(undefined as unknown as string)).toContain(
      "reg:",
    );
  });

  it("preserves internal dots and structure", () => {
    const key1 = getRegistrationCacheKey("sub.example.com");
    const key2 = getRegistrationCacheKey("sub.example.com.");
    expect(key1).toBe(key2);
    expect(key1).toContain("sub.example.com");
  });
});
