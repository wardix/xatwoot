import type { StorageAdapter, UploadParams, UploadResult } from "./StorageAdapter.ts";

/**
 * S3StorageAdapter — VS-INFRA-001
 *
 * Production-ready adapter for AWS S3 and S3-compatible services (e.g. MinIO, Cloudflare R2).
 *
 * Required environment variables:
 *   AWS_ACCESS_KEY_ID     — AWS access key (or MinIO username)
 *   AWS_SECRET_ACCESS_KEY — AWS secret key (or MinIO password)
 *   AWS_REGION            — AWS region (default: us-east-1)
 *   S3_BUCKET             — S3 bucket name
 *   S3_ENDPOINT           — Optional custom endpoint URL (for MinIO / R2 compatibility)
 *   S3_PUBLIC_URL         — Optional CDN base URL (if bucket is public)
 *
 * This implementation uses the AWS SDK v3 (@aws-sdk/client-s3 and @aws-sdk/s3-request-presigner)
 * which must be installed separately:
 *   bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 */
export class S3StorageAdapter implements StorageAdapter {
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint?: string;
  private readonly publicUrl?: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;

  constructor(config?: {
    bucket?: string;
    region?: string;
    endpoint?: string;
    publicUrl?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  }) {
    this.bucket = config?.bucket ?? process.env.S3_BUCKET ?? "";
    this.region = config?.region ?? process.env.AWS_REGION ?? "us-east-1";
    this.endpoint = config?.endpoint ?? process.env.S3_ENDPOINT;
    this.publicUrl = config?.publicUrl ?? process.env.S3_PUBLIC_URL;
    this.accessKeyId = config?.accessKeyId ?? process.env.AWS_ACCESS_KEY_ID ?? "";
    this.secretAccessKey = config?.secretAccessKey ?? process.env.AWS_SECRET_ACCESS_KEY ?? "";

    if (!this.bucket || !this.accessKeyId || !this.secretAccessKey) {
      throw new Error(
        "S3StorageAdapter requires S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY environment variables."
      );
    }
  }

  private getS3Client() {
    // Lazy import — @aws-sdk/client-s3 must be installed
    const { S3Client } = require("@aws-sdk/client-s3");
    return new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
      ...(this.endpoint ? { endpoint: this.endpoint, forcePathStyle: true } : {}),
    });
  }

  async upload(params: UploadParams): Promise<UploadResult> {
    const { PutObjectCommand } = require("@aws-sdk/client-s3");
    const client = this.getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        Metadata: params.metadata,
      })
    );
    const url = this.publicUrl
      ? `${this.publicUrl.replace(/\/$/, "")}/${params.key}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${params.key}`;
    return { key: params.key, url };
  }

  async getSignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
    const client = this.getS3Client();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  }

  async delete(key: string): Promise<void> {
    const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
    const client = this.getS3Client();
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
