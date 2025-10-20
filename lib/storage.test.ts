/* @vitest-environment node */
import { afterEach, describe, expect, it, vi } from "vitest";

const s3Send = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: vi.fn().mockImplementation(() => ({ send: s3Send })),
    PutObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
  };
});
vi.stubEnv("R2_ACCOUNT_ID", "test-account");
vi.stubEnv("R2_ACCESS_KEY_ID", "akid");
vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
vi.stubEnv("R2_BUCKET", "test-bucket");
vi.stubEnv("BLOB_SIGNING_SECRET", "secret");

import { storeImage } from "./storage";

afterEach(() => {
  vi.restoreAllMocks();
  s3Send.mockClear();
});

describe("storage uploads", () => {
  it("storeImage (favicon) returns R2 public URL and key and calls S3", async () => {
    const res = await storeImage({
      kind: "favicon",
      domain: "example.com",
      buffer: Buffer.from([1, 2, 3]),
      width: 32,
      height: 32,
    });
    expect(res.url).toMatch(
      /^https:\/\/test-bucket\.test-account\.r2\.cloudflarestorage\.com\/[a-f0-9]{32}\/32x32\.bin$/,
    );
    expect(res.key).toMatch(/^[a-f0-9]{32}\/32x32\.bin$/);
    expect(s3Send).toHaveBeenCalledTimes(1);
  });

  it("storeImage (screenshot) returns R2 public URL and key and calls S3", async () => {
    const res = await storeImage({
      kind: "screenshot",
      domain: "example.com",
      buffer: Buffer.from([4, 5, 6]),
      width: 1200,
      height: 630,
    });
    expect(res.url).toMatch(
      /^https:\/\/test-bucket\.test-account\.r2\.cloudflarestorage\.com\/[a-f0-9]{32}\/1200x630\.bin$/,
    );
    expect(res.key).toMatch(/^[a-f0-9]{32}\/1200x630\.bin$/);
    expect(s3Send).toHaveBeenCalledTimes(1);
  });

  it("retries on upload failure and succeeds on second attempt", async () => {
    s3Send
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({});

    const res = await storeImage({
      kind: "favicon",
      domain: "retry.com",
      buffer: Buffer.from([1, 2, 3]),
      width: 32,
      height: 32,
    });

    expect(res.url).toMatch(
      /^https:\/\/test-bucket\.test-account\.r2\.cloudflarestorage\.com\/[a-f0-9]{32}\/32x32\.bin$/,
    );
    expect(res.key).toMatch(/^[a-f0-9]{32}\/32x32\.bin$/);
    expect(s3Send).toHaveBeenCalledTimes(2);
  });

  it("retries once on transient failure then succeeds", async () => {
    s3Send
      .mockRejectedValueOnce(new Error("Transient"))
      .mockResolvedValueOnce({});

    const res = await storeImage({
      kind: "favicon",
      domain: "retry.com",
      buffer: Buffer.from([1, 2, 3]),
      width: 32,
      height: 32,
    });

    expect(res.url).toMatch(
      /^https:\/\/test-bucket\.test-account\.r2\.cloudflarestorage\.com\/[a-f0-9]{32}\/32x32\.bin$/,
    );
    expect(res.key).toMatch(/^[a-f0-9]{32}\/32x32\.bin$/);
    expect(s3Send).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting all retry attempts", async () => {
    s3Send.mockRejectedValue(new Error("Persistent error"));

    await expect(
      storeImage({
        kind: "favicon",
        domain: "fail.com",
        buffer: Buffer.from([1, 2, 3]),
        width: 32,
        height: 32,
      }),
    ).rejects.toThrow(/Upload failed after 3 attempts/);

    expect(s3Send).toHaveBeenCalledTimes(3);
  });

  it("succeeds after initial failure", async () => {
    s3Send
      .mockRejectedValueOnce(new Error("S3 API error"))
      .mockResolvedValueOnce({});

    const res = await storeImage({
      kind: "favicon",
      domain: "error.com",
      buffer: Buffer.from([1, 2, 3]),
      width: 32,
      height: 32,
    });

    expect(res.url).toMatch(
      /^https:\/\/test-bucket\.test-account\.r2\.cloudflarestorage\.com\/[a-f0-9]{32}\/32x32\.bin$/,
    );
    expect(res.key).toMatch(/^[a-f0-9]{32}\/32x32\.bin$/);
    expect(s3Send).toHaveBeenCalledTimes(2);
  });
});
