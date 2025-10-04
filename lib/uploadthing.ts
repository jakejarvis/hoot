import "server-only";

import { UTApi, UTFile } from "uploadthing/server";
import type {
  StorageAdapter,
  UploadPublicPngInput,
  UploadResult,
} from "@/lib/storage";

function assertEnv(): void {
  if (process.env.NODE_ENV === "production") {
    if (!process.env.UPLOADTHING_TOKEN) {
      throw new Error("UPLOADTHING_TOKEN required in production");
    }
    if (!process.env.UPLOADTHING_APP_ID) {
      throw new Error("UPLOADTHING_APP_ID required in production");
    }
  }
}

function toUTFileFromBuffer(
  buf: Buffer,
  name: string,
  type: string,
  customId: string,
): UTFile {
  return new UTFile([buf as unknown as BlobPart], name, { type, customId });
}

const ut = new UTApi({ token: process.env.UPLOADTHING_TOKEN });

function buildPublicUfsUrl(key: string): string {
  return `https://${process.env.UPLOADTHING_APP_ID}.ufs.sh/f/${key}`;
}

async function uploadPublicPng(
  input: UploadPublicPngInput,
): Promise<UploadResult> {
  assertEnv();
  const contentType = input.contentType ?? "image/png";
  const filename = input.fileKey.split("/").pop() || "image.png";
  const customId = input.fileKey.replaceAll("/", "-");
  const file = toUTFileFromBuffer(input.png, filename, contentType, customId);
  // Use a stable customId set on the file itself
  try {
    await ut.uploadFiles(file);
  } catch (err) {
    const msg = (err as Error)?.message || "";
    const isDuplicate =
      msg.includes("Duplicate entry") ||
      msg.includes("AlreadyExists") ||
      msg.includes("external_id_idx");
    if (!isDuplicate) throw err;
    // Idempotent: customId already exists — keep using existing object
  }
  // Build canonical ufs URL using app ID and customId (key)
  const url = buildPublicUfsUrl(customId);
  return { url, key: customId };
}

async function deleteByKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await ut.deleteFiles(keys, { keyType: "customId" });
}

async function getUrls(keys: string[]): Promise<Map<string, string>> {
  if (keys.length === 0) return new Map();
  const out = new Map<string, string>();
  for (const k of keys) out.set(k, buildPublicUfsUrl(k));
  return out;
}

export const uploadThingAdapter: StorageAdapter = {
  uploadPublicPng,
  deleteByKeys,
  getUrls,
};
