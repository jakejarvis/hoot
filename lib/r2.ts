import "server-only";

import {
  DeleteObjectsCommand,
  type ObjectIdentifier,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { logger } from "@/lib/logger";

const log = logger();

function getEnvOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function normalizeEndpoint(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  // Ensure a scheme so URL() doesn’t throw if someone sets "localhost:9000"
  if (!/^https?:\/\//i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return trimmed;
}

function isR2Host(u: string): boolean {
  try {
    const host = new URL(u).host;
    return /\.r2\.cloudflarestorage\.com$/i.test(host);
  } catch {
    return false;
  }
}

let s3Singleton: S3Client | null = null;

export function getS3(): S3Client {
  if (s3Singleton) return s3Singleton;

  // creds are required in both local and R2 cases
  const accessKeyId = getEnvOrThrow("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnvOrThrow("R2_SECRET_ACCESS_KEY");

  const endpoint = normalizeEndpoint(process.env.R2_ENDPOINT);
  const usingLocal = !!endpoint && !isR2Host(endpoint);

  if (usingLocal) {
    // ---- Local/Non-R2 S3 endpoint (e.g., MinIO/LocalStack) ----
    s3Singleton = new S3Client({
      region: process.env.R2_REGION || "us-east-1",
      endpoint, // e.g., http://localhost:9000
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  } else {
    // ---- Cloudflare R2 (S3 API) ----
    const accountId =
      process.env.R2_ACCOUNT_ID ||
      (() => {
        if (!endpoint) {
          throw new Error(
            "R2_ACCOUNT_ID is required for Cloudflare R2 but not set",
          );
        }
        return ""; // unused when endpoint is provided explicitly
      })();

    s3Singleton = new S3Client({
      region: "auto",
      endpoint: endpoint || `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      // path-style off for R2
    });
  }

  return s3Singleton;
}

function getBucket(): string {
  return getEnvOrThrow("R2_BUCKET");
}

export function makePublicUrl(key: string): string {
  const bucket = getBucket();

  const explicit = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (explicit) {
    const encoded = key.split("/").map(encodeURIComponent).join("/");
    return `${explicit}/${encoded}`;
  }

  const endpoint = normalizeEndpoint(process.env.R2_ENDPOINT);

  // Local path-style when endpoint is non-R2
  if (endpoint && !isR2Host(endpoint)) {
    const base = `${endpoint.replace(/\/+$/, "")}/${bucket}`;
    const encoded = key.split("/").map(encodeURIComponent).join("/");
    return `${base}/${encoded}`;
  }

  // R2 virtual-hosted default (requires ACCOUNT_ID)
  const accountId = getEnvOrThrow("R2_ACCOUNT_ID");
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `https://${bucket}.${accountId}.r2.cloudflarestorage.com/${encoded}`;
}

export async function putObject(options: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
}): Promise<void> {
  const s3 = getS3();
  const bucket = getBucket();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType,
      CacheControl: options.cacheControl,
    }),
  );
}

export type DeleteResult = Array<{
  key: string;
  deleted: boolean;
  error?: string;
}>;

export async function deleteObjects(keys: string[]): Promise<DeleteResult> {
  const results: DeleteResult = [];
  if (!keys.length) return results;

  const s3 = getS3();
  const bucket = getBucket();

  const MAX_PER_BATCH = 1000;
  for (let i = 0; i < keys.length; i += MAX_PER_BATCH) {
    const slice = keys.slice(i, i + MAX_PER_BATCH);
    const objects: ObjectIdentifier[] = slice.map((k) => ({ Key: k }));
    try {
      const resp = await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: objects, Quiet: false },
        }),
      );

      const deletedSet = new Set<string>(
        (resp.Deleted || []).map((d) => d.Key || ""),
      );
      const errorMap = new Map<string, string>();
      for (const e of resp.Errors || []) {
        if (e.Key) errorMap.set(e.Key, e.Message || e.Code || "unknown");
      }

      for (const k of slice) {
        if (deletedSet.has(k)) {
          results.push({ key: k, deleted: true });
        } else if (errorMap.has(k)) {
          results.push({ key: k, deleted: false, error: errorMap.get(k) });
        } else {
          // Not reported in Deleted or Errors: treat as unknown failure
          results.push({ key: k, deleted: false, error: "unknown" });
        }
      }
    } catch (err) {
      const message = (err as Error)?.message || "unknown";
      log.error("r2.deleteObjects.failed", {
        keys: slice,
        err,
      });
      for (const k of slice) {
        results.push({ key: k, deleted: false, error: message });
      }
    }
  }

  return results;
}
