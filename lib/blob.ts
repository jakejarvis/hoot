import "server-only";

import { createHmac } from "node:crypto";
import { head, put } from "@vercel/blob";

const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;

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
  const input = `${domain}:${size}`;
  const secret = getSigningSecret();
  const digest = createHmac("sha256", secret).update(input).digest("hex");
  // Avoid leaking domain; path is deterministic but unpredictable without secret
  return `favicons/${digest}/${size}.png`;
}

export async function headFaviconBlob(
  domain: string,
  size: number,
): Promise<string | null> {
  const pathname = computeFaviconBlobPath(domain, size);
  try {
    const res = await head(pathname, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return res?.url ?? null;
  } catch {
    return null;
  }
}

export async function putFaviconBlob(
  domain: string,
  size: number,
  png: Buffer,
): Promise<string> {
  const pathname = computeFaviconBlobPath(domain, size);
  const res = await put(pathname, png, {
    access: "public",
    contentType: "image/png",
    cacheControlMaxAge: ONE_WEEK_SECONDS,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return res.url;
}
