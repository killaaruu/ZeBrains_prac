import type { SupabaseClient } from "@supabase/supabase-js";
import type { FileInfo, IStorageService, UploadParams, UploadResult } from "./storage.interface";

export class SupabaseStorageService implements IStorageService {
  constructor(private readonly client: SupabaseClient) {}

  async upload(params: UploadParams): Promise<UploadResult> {
    const { data, error } = await this.client.storage
      .from(params.bucket)
      .upload(params.path, params.file, {
        contentType: params.contentType,
        upsert: params.upsert ?? false,
      });

    if (error) throw new Error(error.message);
    return { path: data.path, fullPath: data.fullPath };
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.client.storage.from(bucket).createSignedUrl(path, expiresIn);

    if (error) throw new Error(error.message);
    return data.signedUrl;
  }

  async delete(bucket: string, paths: string[]): Promise<void> {
    const { error } = await this.client.storage.from(bucket).remove(paths);
    if (error) throw new Error(error.message);
  }

  async list(bucket: string, folder?: string): Promise<FileInfo[]> {
    const { data, error } = await this.client.storage.from(bucket).list(folder);

    if (error) throw new Error(error.message);

    return (data ?? []).map((file) => ({
      name: file.name,
      size: ((file.metadata as Record<string, unknown>)?.size as number) ?? 0,
      mimeType: ((file.metadata as Record<string, unknown>)?.mimetype as string) ?? "",
      createdAt: file.created_at ?? "",
      updatedAt: file.updated_at ?? "",
    }));
  }
}
