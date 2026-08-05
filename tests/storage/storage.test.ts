import { describe, it, expect, afterAll } from "bun:test";
import { existsSync, rmSync } from "fs";
import { join } from "path";
import { LocalStorageAdapter } from "../../src/storage/LocalStorageAdapter.ts";
import { createStorageAdapter } from "../../src/storage/index.ts";

const TEST_UPLOAD_DIR = join(process.cwd(), "tmp/test-uploads");

describe("Cloud Object Storage Adapter (VS-INFRA-001)", () => {
  afterAll(() => {
    if (existsSync(TEST_UPLOAD_DIR)) {
      rmSync(TEST_UPLOAD_DIR, { recursive: true });
    }
  });

  describe("StorageAdapter interface", () => {
    it("LocalStorageAdapter implements the StorageAdapter interface", () => {
      const adapter = new LocalStorageAdapter(TEST_UPLOAD_DIR, "http://localhost:3000/uploads");
      expect(typeof adapter.upload).toBe("function");
      expect(typeof adapter.getSignedUrl).toBe("function");
      expect(typeof adapter.delete).toBe("function");
    });
  });

  describe("LocalStorageAdapter", () => {
    it("uploads a file and returns key + url", async () => {
      const adapter = new LocalStorageAdapter(TEST_UPLOAD_DIR, "http://localhost:3000/uploads");
      const body = Buffer.from("Hello, Xatwoot storage!");
      const result = await adapter.upload({
        key: "accounts/1/attachments/test.txt",
        body,
        contentType: "text/plain",
      });
      expect(result.key).toBe("accounts/1/attachments/test.txt");
      expect(result.url).toContain("test.txt");
    });

    it("creates nested directories on upload", async () => {
      const adapter = new LocalStorageAdapter(TEST_UPLOAD_DIR, "http://localhost:3000/uploads");
      await adapter.upload({
        key: "nested/deep/path/file.png",
        body: Buffer.from("fake-image"),
        contentType: "image/png",
      });
      expect(existsSync(join(TEST_UPLOAD_DIR, "nested/deep/path/file.png"))).toBe(true);
    });

    it("getSignedUrl returns accessible URL for the key", async () => {
      const adapter = new LocalStorageAdapter(TEST_UPLOAD_DIR, "http://localhost:3000/uploads");
      const url = await adapter.getSignedUrl("accounts/1/attachments/test.txt");
      expect(url).toContain("test.txt");
      expect(url).toContain("http://localhost:3000");
    });

    it("deletes an uploaded file", async () => {
      const adapter = new LocalStorageAdapter(TEST_UPLOAD_DIR, "http://localhost:3000/uploads");
      await adapter.upload({ key: "to-delete.txt", body: Buffer.from("bye"), contentType: "text/plain" });
      expect(existsSync(join(TEST_UPLOAD_DIR, "to-delete.txt"))).toBe(true);
      await adapter.delete("to-delete.txt");
      expect(existsSync(join(TEST_UPLOAD_DIR, "to-delete.txt"))).toBe(false);
    });

    it("delete is idempotent for non-existing keys", async () => {
      const adapter = new LocalStorageAdapter(TEST_UPLOAD_DIR, "http://localhost:3000/uploads");
      await expect(adapter.delete("ghost-file.txt")).resolves.toBeUndefined();
    });
  });

  describe("createStorageAdapter factory", () => {
    it("returns LocalStorageAdapter when STORAGE_DRIVER is not set", () => {
      const original = process.env.STORAGE_DRIVER;
      delete process.env.STORAGE_DRIVER;
      const adapter = createStorageAdapter();
      expect(typeof adapter.upload).toBe("function");
      process.env.STORAGE_DRIVER = original;
    });

    it("S3StorageAdapter class exists and is exported", async () => {
      const { S3StorageAdapter } = await import("../../src/storage/index.ts");
      expect(typeof S3StorageAdapter).toBe("function");
    });
  });
});
