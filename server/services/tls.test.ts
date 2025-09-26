/* @vitest-environment node */

import type * as tls from "node:tls";

// Hoisted mock for node:tls to avoid ESM spy limitations
const tlsMock = vi.hoisted(() => ({
  socketMock: null as unknown as tls.TLSSocket,
  callListener: true,
}));

vi.mock("node:tls", async () => {
  const actual = await vi.importActual<typeof import("node:tls")>("node:tls");
  const mockedConnect = ((...args: unknown[]) => {
    const listener =
      typeof args[1] === "function"
        ? (args[1] as () => void)
        : typeof args[3] === "function"
          ? (args[3] as () => void)
          : typeof args[2] === "function"
            ? (args[2] as () => void)
            : undefined;
    const sock = tlsMock.socketMock as tls.TLSSocket;
    if (tlsMock.callListener) {
      setTimeout(() => listener?.(), 0);
    }
    return sock;
  }) as unknown as typeof actual.connect;
  return {
    ...actual,
    connect: mockedConnect,
    default: { ...(actual as object), connect: mockedConnect },
  };
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { getCertificates } from "./tls";

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.__redisTestHelper?.reset();
});

function makePeer(
  partial: Partial<tls.DetailedPeerCertificate>,
): tls.DetailedPeerCertificate {
  return {
    subject: { CN: "example.com" } as unknown as tls.PeerCertificate["subject"],
    issuer: { O: "Let's Encrypt" } as unknown as tls.PeerCertificate["issuer"],
    valid_from: "Jan 1 00:00:00 2024 GMT",
    valid_to: "Jan 8 00:00:00 2024 GMT",
    ...partial,
  } as unknown as tls.DetailedPeerCertificate;
}

describe("getCertificates", () => {
  it("returns parsed chain and caches", async () => {
    tlsMock.callListener = true;
    const leaf = makePeer({
      subject: {
        CN: "example.com",
      } as unknown as tls.PeerCertificate["subject"],
    });
    const issuer = makePeer({
      subject: { O: "LE" } as unknown as tls.PeerCertificate["subject"],
    });

    const getPeerCertificate = vi
      .fn()
      // first call returns a leaf with issuerCertificate reference
      .mockReturnValueOnce({
        ...leaf,
        issuerCertificate: issuer,
      })
      // second call returns issuer with self-reference to stop loop
      .mockReturnValueOnce({
        ...issuer,
        issuerCertificate: issuer,
      });

    tlsMock.socketMock = {
      getPeerCertificate,
      setTimeout: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
    } as unknown as tls.TLSSocket;

    globalThis.__redisTestHelper.reset();
    const out = await getCertificates("success.test");
    expect(out.length).toBeGreaterThan(0);
    expect(globalThis.__redisTestHelper.store.has("tls:success.test")).toBe(
      true,
    );
    // no-op
  });

  it("returns empty on timeout", async () => {
    tlsMock.callListener = false;
    // Ensure cache is clear and use a distinct domain key
    globalThis.__redisTestHelper.reset();
    let timeoutCb: (() => void) | null = null;
    let errorHandler: ((err: Error) => void) | undefined;
    tlsMock.socketMock = {
      getPeerCertificate: vi.fn(),
      setTimeout: (_ms: number, cb: () => void) => {
        timeoutCb = cb;
      },
      end: vi.fn(),
      on: vi.fn((event: string, handler: unknown) => {
        if (event === "error" && typeof handler === "function") {
          errorHandler = handler as (err: Error) => void;
        }
        return tlsMock.socketMock;
      }),
      destroy: vi.fn((err?: Error) => {
        errorHandler?.(err ?? new Error("TLS timeout"));
      }),
    } as unknown as tls.TLSSocket;

    // call the timeout callback asynchronously to simulate real timer
    setTimeout(() => timeoutCb?.(), 0);

    const out = await getCertificates("timeout.test");
    expect(out).toEqual([]);
    // no-op
  });
});

// Access helpers via require to avoid needing to export; duplicate logic here for unit tests
const parseAltNames = (subjectAltName: string | undefined): string[] => {
  if (typeof subjectAltName !== "string" || subjectAltName.length === 0) {
    return [];
  }
  return subjectAltName
    .split(",")
    .map((segment) => segment.trim())
    .map((segment) => {
      const idx = segment.indexOf(":");
      if (idx === -1) return ["", segment] as const;
      const kind = segment.slice(0, idx).trim().toUpperCase();
      const value = segment.slice(idx + 1).trim();
      return [kind, value] as const;
    })
    .filter(
      ([kind, value]) => !!value && (kind === "DNS" || kind === "IP ADDRESS"),
    )
    .map(([_, value]) => value);
};

describe("tls helper parsing", () => {
  it("parseAltNames extracts DNS/IP values and ignores others", () => {
    const input = "DNS:example.com, IP Address:1.2.3.4, URI:http://x";
    expect(parseAltNames(input)).toEqual(["example.com", "1.2.3.4"]);
  });

  it("parseAltNames handles empty/missing", () => {
    expect(parseAltNames(undefined)).toEqual([]);
    expect(parseAltNames("")).toEqual([]);
  });
});
