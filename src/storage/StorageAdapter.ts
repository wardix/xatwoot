/**
 * Storage Adapter Interface — VS-INFRA-001
 *
 * Defines the contract for all storage backends (Local, S3, MinIO).
 * New adapters must implement this interface for a seamless swap.
 */
export interface StorageAdapter {
  /**
   * Upload a file buffer and return a permanent storage key.
   */
  upload(params: UploadParams): Promise<UploadResult>;

  /**
   * Generate a pre-signed URL for temporary access to a private object.
   */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Delete an object by its storage key.
   */
  delete(key: string): Promise<void>;
}

export interface UploadParams {
  /** Unique key / path within the bucket/directory (e.g. "accounts/1/attachments/uuid.png") */
  key: string;
  /** Raw file content */
  body: Buffer | Uint8Array;
  /** MIME content type */
  contentType: string;
  /** Optional object-level metadata */
  metadata?: Record<string, string>;
}

export interface UploadResult {
  /** Storage key for later retrieval */
  key: string;
  /** Direct or CDN URL (publicly accessible) */
  url: string;
}
