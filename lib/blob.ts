import "server-only";

import { createHmac } from "node:crypto";
import { put } from "@vercel/blob";

const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;

function toPositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function getFaviconTtlSeconds(): number {
  return toPositiveInt(process.env.FAVICON_TTL_SECONDS, ONE_WEEK_SECONDS);
}

export function getScreenshotTtlSeconds(): number {
  return toPositiveInt(process.env.SCREENSHOT_TTL_SECONDS, ONE_WEEK_SECONDS);
}

function getSigningSecret(): string {
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.BLOB_SIGNING_SECRET
  ) {
    throw new Error("BLOB_SIGNING_SECRET required in production");
  }

  const secret =
    process.env.BLOB_SIGNING_SECRET ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    "dev-favicon-secret";
  return secret;
}

export function computeFaviconBlobPath(domain: string, size: number): string {
  const input = `${domain}:${size}`;
  const secret = getSigningSecret();
  const digest = createHmac("sha256", secret).update(input).digest("hex");
  // Avoid leaking domain; path is deterministic but unpredictable without secret
  return `favicons/${digest}/${size}.png`;
}

export async function putFaviconBlob(
  domain: string,
  size: number,
  png: Buffer,
): Promise<string> {
  const input = `${domain}:${size}`;
  const secret = getSigningSecret();
  const digest = createHmac("sha256", secret).update(input).digest("hex");
  const pathname = `favicons/${digest}/${size}.png`;
  const res = await put(pathname, png, {
    access: "public",
    contentType: "image/png",
    cacheControlMaxAge: getFaviconTtlSeconds(),
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return res.url;
}

// Screenshot blob helpers (same HMAC hashing approach as favicons)

export function computeScreenshotBlobPath(
  domain: string,
  width: number,
  height: number,
): string {
  const input = `${domain}:${width}x${height}`;
  const secret = getSigningSecret();
  const digest = createHmac("sha256", secret).update(input).digest("hex");
  return `screenshots/${digest}/${width}x${height}.png`;
}

export async function putScreenshotBlob(
  domain: string,
  width: number,
  height: number,
  png: Buffer,
): Promise<string> {
  const input = `${domain}:${width}x${height}`;
  const secret = getSigningSecret();
  const digest = createHmac("sha256", secret).update(input).digest("hex");
  const pathname = `screenshots/${digest}/${width}x${height}.png`;
  const res = await put(pathname, png, {
    access: "public",
    contentType: "image/png",
    cacheControlMaxAge: getScreenshotTtlSeconds(),
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return res.url;
}
