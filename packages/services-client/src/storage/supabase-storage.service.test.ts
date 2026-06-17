import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseStorageService } from "./supabase-storage.service";

function createMockClient() {
  const mockFrom = {
    upload: vi.fn(),
    getPublicUrl: vi.fn(),
    createSignedUrl: vi.fn(),
    remove: vi.fn(),
    list: vi.fn(),
  };
  return {
    storage: { from: vi.fn(() => mockFrom) },
    _mockFrom: mockFrom,
  };
}

describe("SupabaseStorageService", () => {
  let service: SupabaseStorageService;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockClient = createMockClient();
    service = new SupabaseStorageService(mockClient as any);
  });

  describe("upload", () => {
    it("uploads a file and returns path info", async () => {
      mockClient._mockFrom.upload.mockResolvedValue({
        data: { path: "resume-templates/abc/file.pdf", fullPath: "resume-templates/abc/file.pdf" },
        error: null,
      });

      const result = await service.upload({
        bucket: "resume-templates",
        path: "abc/file.pdf",
        file: new Blob(["test"]),
        contentType: "application/pdf",
      });

      expect(mockClient.storage.from).toHaveBeenCalledWith("resume-templates");
      expect(mockClient._mockFrom.upload).toHaveBeenCalledWith("abc/file.pdf", expect.anything(), {
        contentType: "application/pdf",
        upsert: false,
      });
      expect(result).toEqual({
        path: "resume-templates/abc/file.pdf",
        fullPath: "resume-templates/abc/file.pdf",
      });
    });

    it("throws on upload error", async () => {
      mockClient._mockFrom.upload.mockResolvedValue({
        data: null,
        error: { message: "Bucket not found" },
      });

      await expect(
        service.upload({
          bucket: "resume-templates",
          path: "abc/file.pdf",
          file: new Blob(["test"]),
        }),
      ).rejects.toThrow("Bucket not found");
    });

    it("passes upsert option when provided", async () => {
      mockClient._mockFrom.upload.mockResolvedValue({
        data: { path: "p", fullPath: "fp" },
        error: null,
      });

      await service.upload({
        bucket: "b",
        path: "p",
        file: new Blob([]),
        upsert: true,
      });

      expect(mockClient._mockFrom.upload).toHaveBeenCalledWith("p", expect.anything(), {
        contentType: undefined,
        upsert: true,
      });
    });
  });

  describe("getPublicUrl", () => {
    it("returns public URL string", () => {
      mockClient._mockFrom.getPublicUrl.mockReturnValue({
        data: { publicUrl: "https://storage.example.com/bucket/file.pdf" },
      });

      const url = service.getPublicUrl("bucket", "file.pdf");
      expect(url).toBe("https://storage.example.com/bucket/file.pdf");
      expect(mockClient.storage.from).toHaveBeenCalledWith("bucket");
    });
  });

  describe("getSignedUrl", () => {
    it("returns signed URL with default expiry", async () => {
      mockClient._mockFrom.createSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://signed.url" },
        error: null,
      });

      const url = await service.getSignedUrl("bucket", "file.pdf");
      expect(url).toBe("https://signed.url");
      expect(mockClient._mockFrom.createSignedUrl).toHaveBeenCalledWith("file.pdf", 3600);
    });

    it("uses custom expiry", async () => {
      mockClient._mockFrom.createSignedUrl.mockResolvedValue({
        data: { signedUrl: "https://signed.url" },
        error: null,
      });

      await service.getSignedUrl("bucket", "file.pdf", 600);
      expect(mockClient._mockFrom.createSignedUrl).toHaveBeenCalledWith("file.pdf", 600);
    });

    it("throws on error", async () => {
      mockClient._mockFrom.createSignedUrl.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      await expect(service.getSignedUrl("bucket", "file.pdf")).rejects.toThrow("Not found");
    });
  });

  describe("delete", () => {
    it("deletes files from bucket", async () => {
      mockClient._mockFrom.remove.mockResolvedValue({ data: [], error: null });

      await service.delete("bucket", ["a.pdf", "b.pdf"]);
      expect(mockClient.storage.from).toHaveBeenCalledWith("bucket");
      expect(mockClient._mockFrom.remove).toHaveBeenCalledWith(["a.pdf", "b.pdf"]);
    });

    it("throws on error", async () => {
      mockClient._mockFrom.remove.mockResolvedValue({
        data: null,
        error: { message: "Permission denied" },
      });

      await expect(service.delete("bucket", ["a.pdf"])).rejects.toThrow("Permission denied");
    });
  });

  describe("list", () => {
    it("lists files in folder", async () => {
      mockClient._mockFrom.list.mockResolvedValue({
        data: [
          {
            name: "file.pdf",
            metadata: {
              size: 1024,
              mimetype: "application/pdf",
            },
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ],
        error: null,
      });

      const files = await service.list("bucket", "folder");
      expect(files).toEqual([
        {
          name: "file.pdf",
          size: 1024,
          mimeType: "application/pdf",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ]);
    });

    it("lists files at root when no folder", async () => {
      mockClient._mockFrom.list.mockResolvedValue({ data: [], error: null });

      await service.list("bucket");
      expect(mockClient._mockFrom.list).toHaveBeenCalledWith(undefined);
    });

    it("throws on error", async () => {
      mockClient._mockFrom.list.mockResolvedValue({
        data: null,
        error: { message: "Error" },
      });

      await expect(service.list("bucket")).rejects.toThrow("Error");
    });
  });
});
