import "server-only";

export type UploadPublicPngInput = {
  fileKey: string;
  png: Buffer;
  contentType?: string;
  cacheSeconds?: number;
};

export type UploadResult = {
  url: string;
  key: string;
};

export interface StorageAdapter {
  uploadPublicPng(input: UploadPublicPngInput): Promise<UploadResult>;
  deleteByKeys(keys: string[]): Promise<void>;
  getUrls(keys: string[]): Promise<Map<string, string>>;
}

let _adapter: StorageAdapter | null = null;

export function setStorageAdapter(adapter: StorageAdapter): void {
  _adapter = adapter;
}

export async function getStorageAdapter(): Promise<StorageAdapter> {
  if (_adapter) return _adapter;
  const provider = process.env.STORAGE_PROVIDER || "uploadthing";
  if (provider === "uploadthing") {
    // Lazy import to avoid bringing provider SDKs into client bundles
    // and to keep swapping cheap in tests.
    const { uploadThingAdapter } = await import("@/lib/uploadthing");
    _adapter = uploadThingAdapter as StorageAdapter;
    return _adapter;
  }
  throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
}
