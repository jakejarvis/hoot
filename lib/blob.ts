import "server-only";

import { createHmac } from "node:crypto";
import { head, put } from "@vercel/blob";

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

function getBucket(nowMs: number, ttlSeconds: number): number {
  return Math.floor(nowMs / (ttlSeconds * 1000));
}

export function getFaviconBucket(nowMs = Date.now()): number {
  return getBucket(nowMs, getFaviconTtlSeconds());
}

export function getScreenshotBucket(nowMs = Date.now()): number {
  return getBucket(nowMs, getScreenshotTtlSeconds());
}

function getSigningSecret(): string {
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.FAVICON_BLOB_SIGNING_SECRET
  ) {
    throw new Error("FAVICON_BLOB_SIGNING_SECRET required in production");
  }

  const secret =
    process.env.FAVICON_BLOB_SIGNING_SECRET ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    "dev-favicon-secret";
  return secret;
}

export function computeFaviconBlobPath(domain: string, size: number): string {
  const bucket = getFaviconBucket();
  const input = `${bucket}:${domain}:${size}`;
  const secret = getSigningSecret();
  const digest = createHmac("sha256", secret).update(input).digest("hex");
  // Avoid leaking domain; path is deterministic but unpredictable without secret
  return `favicons/${bucket}/${digest}/${size}.png`;
}

export async function headFaviconBlob(
  domain: string,
  size: number,
): Promise<string | null> {
  const current = getFaviconBucket();
  const candidates = [current, current - 1];
  for (const bucket of candidates) {
    const input = `${bucket}:${domain}:${size}`;
    const secret = getSigningSecret();
    const digest = createHmac("sha256", secret).update(input).digest("hex");
    const pathname = `favicons/${bucket}/${digest}/${size}.png`;
    try {
      const res = await head(pathname, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      if (res?.url) return res.url;
    } catch {
      // try next candidate
    }
  }
  return null;
}

export async function putFaviconBlob(
  domain: string,
  size: number,
  png: Buffer,
): Promise<string> {
  const bucket = getFaviconBucket();
  const input = `${bucket}:${domain}:${size}`;
  const secret = getSigningSecret();
  const digest = createHmac("sha256", secret).update(input).digest("hex");
  const pathname = `favicons/${bucket}/${digest}/${size}.png`;
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
  const bucket = getScreenshotBucket();
  const input = `${bucket}:${domain}:${width}x${height}`;
  const secret = getSigningSecret();
  const digest = createHmac("sha256", secret).update(input).digest("hex");
  return `screenshots/${bucket}/${digest}/${width}x${height}.png`;
}

export async function headScreenshotBlob(
  domain: string,
  width: number,
  height: number,
): Promise<string | null> {
  const current = getScreenshotBucket();
  const candidates = [current, current - 1];
  for (const bucket of candidates) {
    const input = `${bucket}:${domain}:${width}x${height}`;
    const secret = getSigningSecret();
    const digest = createHmac("sha256", secret).update(input).digest("hex");
    const pathname = `screenshots/${bucket}/${digest}/${width}x${height}.png`;
    try {
      const res = await head(pathname, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      if (res?.url) return res.url;
    } catch {
      // try next candidate
    }
  }
  return null;
}

export async function putScreenshotBlob(
  domain: string,
  width: number,
  height: number,
  png: Buffer,
): Promise<string> {
  const bucket = getScreenshotBucket();
  const input = `${bucket}:${domain}:${width}x${height}`;
  const secret = getSigningSecret();
  const digest = createHmac("sha256", secret).update(input).digest("hex");
  const pathname = `screenshots/${bucket}/${digest}/${width}x${height}.png`;
  const res = await put(pathname, png, {
    access: "public",
    contentType: "image/png",
    cacheControlMaxAge: getScreenshotTtlSeconds(),
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return res.url;
}
