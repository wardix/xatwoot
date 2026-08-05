import type { StorageAdapter } from "./StorageAdapter.ts";
import { LocalStorageAdapter } from "./LocalStorageAdapter.ts";
import { S3StorageAdapter } from "./S3StorageAdapter.ts";

export type StorageDriver = "local" | "s3";

/**
 * createStorageAdapter — VS-INFRA-001
 *
 * Factory function that returns the appropriate StorageAdapter based on the
 * STORAGE_DRIVER environment variable (defaults to "local").
 *
 * Set STORAGE_DRIVER=s3 in production together with:
 *   S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 */
export function createStorageAdapter(): StorageAdapter {
  const driver = (process.env.STORAGE_DRIVER ?? "local") as StorageDriver;

  switch (driver) {
    case "s3":
      return new S3StorageAdapter();
    case "local":
    default:
      return new LocalStorageAdapter(
        process.env.UPLOAD_DIR ?? "./uploads",
        process.env.UPLOAD_BASE_URL ?? "http://localhost:3000/uploads"
      );
  }
}

/** Singleton storage adapter — shared across the application */
export const storage: StorageAdapter = createStorageAdapter();

export type { StorageAdapter, UploadParams, UploadResult } from "./StorageAdapter.ts";
export { LocalStorageAdapter } from "./LocalStorageAdapter.ts";
export { S3StorageAdapter } from "./S3StorageAdapter.ts";
