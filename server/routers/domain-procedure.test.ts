/* @vitest-environment node */

import { TRPCError } from "@trpc/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ZodError } from "zod";
import { router } from "../trpc";
import { createDomainProcedure, domainInput } from "./domain-procedure";

vi.mock("@/lib/analytics/server", () => ({
  captureServer: vi.fn(async () => undefined),
}));

vi.mock("@/lib/domain", () => ({
  normalizeDomainInput: (s: string) => s.trim().toLowerCase(),
}));

vi.mock("@/lib/domain-server", () => ({
  isAcceptableDomainInput: (s: string) => /\./.test(s) && !/\s/.test(s),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe("createDomainProcedure", () => {
  it("transforms valid input and calls service", async () => {
    const service = vi.fn(async (d: string) => ({ ok: true, domain: d }));
    const testRouter = router({ test: createDomainProcedure(service, "x") });
    const caller = testRouter.createCaller({});
    const result = await caller.test({ domain: "  WWW.Example.COM  " });
    expect(service).toHaveBeenCalledWith("www.example.com");
    expect(result).toEqual({ ok: true, domain: "www.example.com" });
  });

  it("throws TRPCError for service failures", async () => {
    const service = vi.fn(async () => {
      throw new Error("boom");
    });
    const testRouter = router({
      test: createDomainProcedure(service, "Custom error"),
    });
    const caller = testRouter.createCaller({});
    await expect(caller.test({ domain: "example.com" })).rejects.toBeInstanceOf(
      TRPCError,
    );
  });
});
