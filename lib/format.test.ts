import { describe, expect, it } from "vitest";
import {
  equalHostname,
  formatDate,
  formatRegistrant,
  formatTtl,
} from "./format";

describe("formatDate", () => {
  it("formats ISO string to locale string", () => {
    const iso = "2024-01-01T00:00:00.000Z";
    const out = formatDate(iso);
    expect(out).toBeTypeOf("string");
    expect(out.length).toBeGreaterThan(0);
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
});

describe("equalHostname", () => {
  it("ignores case and whitespace", () => {
    expect(equalHostname(" ExAmple.COM ", "example.com")).toBe(true);
  });
});
