import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import type { StorageAdapter, UploadParams, UploadResult } from "./StorageAdapter.ts";

/**
 * LocalStorageAdapter — VS-INFRA-001
 *
 * Stores files on the local filesystem. Intended for development and testing only.
 * Production workloads should use S3StorageAdapter or MinioStorageAdapter.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly baseDir: string;
  private readonly baseUrl: string;

  constructor(
    baseDir: string = "./uploads",
    baseUrl: string = "http://localhost:3000/uploads"
  ) {
    this.baseDir = baseDir;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async upload(params: UploadParams): Promise<UploadResult> {
    const filePath = join(this.baseDir, params.key);
    const dir = filePath.substring(0, filePath.lastIndexOf("/"));
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, params.body);
    return {
      key: params.key,
      url: `${this.baseUrl}/${params.key}`,
    };
  }

  async getSignedUrl(key: string, _expiresInSeconds: number = 3600): Promise<string> {
    // Local files are served directly — no signing required
    return `${this.baseUrl}/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.baseDir, key);
    if (existsSync(filePath)) {
      rmSync(filePath);
    }
  }
}
