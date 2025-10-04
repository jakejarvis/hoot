import "server-only";

import { createHmac } from "node:crypto";
import {
  cacheGet,
  cacheSet,
  ns,
  releaseLock,
  tryAcquireLock,
} from "@/lib/redis";
import { getStorageAdapter } from "@/lib/storage";

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
    !process.env.BLOB_SIGNING_SECRET
  ) {
    throw new Error("BLOB_SIGNING_SECRET required in production");
  }
  const secret = process.env.BLOB_SIGNING_SECRET || "dev-favicon-secret";
  return secret;
}

function hmacHex(input: string): string {
  const secret = getSigningSecret();
  return createHmac("sha256", secret).update(input).digest("hex");
}

function faviconIndexKey(bucket: number, digest: string, size: number): string {
  return ns("icon:index", `${bucket}:${digest}:${size}`);
}

function screenshotIndexKey(
  bucket: number,
  digest: string,
  width: number,
  height: number,
): string {
  return ns("screenshot:index", `${bucket}:${digest}:${width}x${height}`);
}

function bucketSetKey(kind: Kind, bucket: number): string {
  return ns(`${kind}:bucket`, String(bucket));
}

type IndexEntry = { providerKey: string; url: string };
type BucketEntry = { providerKey: string; indexKey: string };

type Kind = "icon" | "screenshot";

function ttlForKind(kind: Kind): number {
  return kind === "icon" ? getFaviconTtlSeconds() : getScreenshotTtlSeconds();
}

function bucketForKind(kind: Kind): number {
  return kind === "icon" ? getFaviconBucket() : getScreenshotBucket();
}

function buildCustomId(
  kind: Kind,
  bucket: number,
  digest: string,
  dimsKey: string,
): string {
  return `${kind}-${bucket}-${digest}-${dimsKey}.png`;
}

function indexKeyForKind(
  kind: Kind,
  bucket: number,
  digest: string,
  dimsKey: string,
): string {
  return kind === "icon"
    ? faviconIndexKey(bucket, digest, Number(dimsKey))
    : screenshotIndexKey(
        bucket,
        digest,
        Number(dimsKey.split("x")[0] || 0),
        Number(dimsKey.split("x")[1] || 0),
      );
}

async function headForKind(
  kind: Kind,
  domain: string,
  dimsKey: string,
): Promise<string | null> {
  const current = bucketForKind(kind);
  const candidates = [current, current - 1];
  for (const bucket of candidates) {
    const digest = hmacHex(`${bucket}:${domain}:${dimsKey}`);
    const indexKey = indexKeyForKind(kind, bucket, digest, dimsKey);
    const entry = await cacheGet<IndexEntry>(indexKey);
    if (entry?.url) return entry.url;
  }
  return null;
}

async function putForKind(
  kind: Kind,
  domain: string,
  dimsKey: string,
  png: Buffer,
): Promise<string> {
  const bucket = bucketForKind(kind);
  const digest = hmacHex(`${bucket}:${domain}:${dimsKey}`);
  const pathname = buildCustomId(kind, bucket, digest, dimsKey);
  const indexKey = indexKeyForKind(kind, bucket, digest, dimsKey);
  const lockKey = ns("upload:lock", pathname);

  // Attempt to acquire a short-lived lock to avoid duplicate uploads/logs
  const acquired = await tryAcquireLock(lockKey, 10);
  if (!acquired) {
    // Someone else is likely uploading. Wait briefly for index to appear.
    const started = Date.now();
    const deadline = started + 1500;
    while (Date.now() < deadline) {
      const existing = await cacheGet<IndexEntry>(indexKey);
      if (existing?.url) return existing.url;
      await new Promise((r) => setTimeout(r, 75));
    }
  }

  let url: string;
  let key: string;
  try {
    const res = await getStorageAdapter().uploadPublicPng({
      fileKey: pathname,
      png,
      contentType: "image/png",
      cacheSeconds: ttlForKind(kind),
    });
    url = res.url;
    key = res.key;
  } finally {
    // Release lock regardless of outcome to avoid deadlocks
    try {
      await releaseLock(lockKey);
    } catch {}
  }
  const indexEntry: IndexEntry = { providerKey: key, url };
  await cacheSet(indexKey, indexEntry, ttlForKind(kind));
  await addToBucket(
    kind,
    bucket,
    { providerKey: key, indexKey },
    ttlForKind(kind),
  );
  return url;
}

async function addToBucket(
  kind: Kind,
  bucket: number,
  entry: BucketEntry,
  ttlSeconds: number,
): Promise<void> {
  const key = bucketSetKey(kind, bucket);
  const existing = (await cacheGet<BucketEntry[]>(key)) || [];
  const has = existing.some((e) => e.providerKey === entry.providerKey);
  const next = has ? existing : [...existing, entry];
  // Keep bucket sets around a bit longer than TTL to allow pruning window
  const extendedTtl = Math.max(ttlSeconds * 3, ttlSeconds + 3600);
  await cacheSet(key, next, extendedTtl);
}

export async function headFaviconBlob(
  domain: string,
  size: number,
): Promise<string | null> {
  return headForKind("icon", domain, String(size));
}

export async function putFaviconBlob(
  domain: string,
  size: number,
  png: Buffer,
): Promise<string> {
  return putForKind("icon", domain, String(size), png);
}

export async function headScreenshotBlob(
  domain: string,
  width: number,
  height: number,
): Promise<string | null> {
  return headForKind("screenshot", domain, `${width}x${height}`);
}

export async function putScreenshotBlob(
  domain: string,
  width: number,
  height: number,
  png: Buffer,
): Promise<string> {
  return putForKind("screenshot", domain, `${width}x${height}`, png);
}
