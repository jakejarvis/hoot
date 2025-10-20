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
  const base =
    process.env.R2_PUBLIC_BASE_URL ||
    `https://${bucket}.${accountId}.r2.cloudflarestorage.com`;
  return `${base}/${encodeURI(key)}`;
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

export async function deleteObjects(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const s3 = getS3();
  const bucket = getBucket();

  const MAX_PER_BATCH = 1000;
  for (let i = 0; i < keys.length; i += MAX_PER_BATCH) {
    const slice = keys.slice(i, i + MAX_PER_BATCH);
    const objects: ObjectIdentifier[] = slice.map((k) => ({ Key: k }));
    const cmd = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: objects, Quiet: true },
    });
    await s3.send(cmd);
  }
}
