import "server-only";

import {
  DeleteObjectsCommand,
  type ObjectIdentifier,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

let s3Singleton: S3Client | null = null;

export function getS3(): S3Client {
  if (s3Singleton) return s3Singleton;
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");

  s3Singleton = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  return s3Singleton;
}

export function getBucket(): string {
  return requireEnv("R2_BUCKET");
}

export function makePublicUrl(key: string): string {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const bucket = getBucket();
  const rawBase =
    process.env.R2_PUBLIC_BASE_URL ||
    `https://${bucket}.${accountId}.r2.cloudflarestorage.com`;
  const base = rawBase.replace(/\/+$/, "");
  const encodedKey = key
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  return `${base}/${encodedKey}`;
}

export async function putObject(options: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
}): Promise<void> {
  const s3 = getS3();
  const bucket = getBucket();
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: options.key,
    Body: options.body,
    ContentType: options.contentType,
    CacheControl: options.cacheControl,
  });
  await s3.send(cmd);
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
      const cmd = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: objects, Quiet: false },
      });
      const resp = await s3.send(cmd);

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
      for (const k of slice) {
        results.push({ key: k, deleted: false, error: message });
      }
    }
  }

  return results;
}
