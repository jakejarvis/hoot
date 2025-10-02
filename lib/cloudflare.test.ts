/* @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";
import { isCloudflareIpAsync } from "./cloudflare";

describe("isCloudflareIpAsync", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("matches IPv4 and IPv6 against ranges", async () => {
    // Mock fetch of CF ranges
    const body = (data: unknown) =>
      new Response(JSON.stringify(data), { status: 200 });
    const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async () =>
      body({
        result: {
          ipv4_cidrs: ["1.2.3.0/24"],
          ipv6_cidrs: ["2001:db8::/32"],
        },
      }),
    );

    expect(await isCloudflareIpAsync("1.2.3.4")).toBe(true);
    expect(await isCloudflareIpAsync("5.6.7.8")).toBe(false);
    expect(await isCloudflareIpAsync("2001:db8::1")).toBe(true);
    expect(await isCloudflareIpAsync("2001:dead::1")).toBe(false);
    fetchMock.mockRestore();
  });
});
