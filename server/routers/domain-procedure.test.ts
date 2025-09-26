/* @vitest-environment node */
import { describe, expect, it, vi } from "vitest";
import type { ZodError } from "zod";
import { domainInput } from "./domain-procedure";

vi.mock("@/lib/domain", () => ({
  normalizeDomainInput: (s: string) => s.trim().toLowerCase(),
}));

vi.mock("@/lib/domain-server", () => ({
  isAcceptableDomainInput: (s: string) => /\./.test(s) && !/\s/.test(s),
}));

describe("domainInput schema", () => {
  it("normalizes and accepts valid domains", () => {
    const out = domainInput.parse({ domain: "  WWW.Example.COM  " });
    expect(out.domain).toBe("www.example.com");
  });

  it("rejects invalid domains", () => {
    const res = domainInput.safeParse({ domain: "invalid domain" });
    expect(res.success).toBe(false);
    if (!res.success) {
      const err = (res as { success: false; error: ZodError }).error;
      expect(err.issues[0]?.message).toBe("Invalid domain");
    }
  });
});
