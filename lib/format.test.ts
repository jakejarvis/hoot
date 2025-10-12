/* @vitest-environment node */
import { describe, expect, it } from "vitest";
import { formatDate, formatTtl } from "./format";

describe("formatDate", () => {
  it("formats ISO string to locale string", () => {
    const iso = "2024-01-01T00:00:00.000Z";
    const out = formatDate(iso);
    expect(out).toBeTypeOf("string");
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("formatTtl", () => {
  it("prints seconds for small values", () => {
    expect(formatTtl(45)).toBe("45s");
  });

  it("prints minutes and seconds", () => {
    expect(formatTtl(125)).toBe("2m");
  });

  it("prints hours and minutes", () => {
    expect(formatTtl(3660)).toBe("1h 1m");
  });

  it("echoes invalid or non-positive TTL", () => {
    expect(formatTtl(0)).toBe("0s");
    expect(formatTtl(Number.NaN)).toBe("NaNs");
    expect(formatTtl(-5)).toBe("-5s");
  });
});
