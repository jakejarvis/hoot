import { describe, expect, it } from "vitest";
import { isValidDomain, normalizeDomainInput } from "./domain";

describe("normalizeDomainInput", () => {
  it("strips scheme, auth, port, path and lowercases", () => {
    expect(
      normalizeDomainInput("https://user:pass@WWW.Example.COM:8080/a/b?c#d"),
    ).toBe("example.com");
  });

  it("removes trailing dot and leading www", () => {
    expect(normalizeDomainInput("www.example.com.")).toBe("example.com");
  });

  it("handles inputs without scheme via implicit URL parsing", () => {
    expect(normalizeDomainInput("Sub.Example.com/extra")).toBe(
      "sub.example.com",
    );
  });

  it("falls back on invalid URL-with-scheme by manual stripping", () => {
    expect(normalizeDomainInput("fake+scheme://ex-ample.com/path")).toBe(
      "ex-ample.com",
    );
  });
});

describe("isValidDomain", () => {
  it("accepts typical domains", () => {
    expect(isValidDomain("example.com")).toBe(true);
    expect(isValidDomain("sub.example.co.uk")).toBe(true);
  });

  it("accepts punycoded labels", () => {
    expect(isValidDomain("xn--bcher-kva.example")).toBe(true);
  });

  it("rejects localhost and invalid labels", () => {
    expect(isValidDomain("localhost")).toBe(false);
    expect(isValidDomain("exa_mple.com")).toBe(false);
    expect(isValidDomain("-badstart.com")).toBe(false);
    expect(isValidDomain("badend-.com")).toBe(false);
  });
});
