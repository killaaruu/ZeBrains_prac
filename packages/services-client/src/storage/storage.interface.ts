export interface UploadParams {
  bucket: string;
  path: string;
  file: File | Blob | ArrayBuffer;
  contentType?: string;
  upsert?: boolean;
}

export interface UploadResult {
  path: string;
  fullPath: string;
}

export interface FileInfo {
  name: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  mimeType: string;
}

export interface IStorageService {
  upload(params: UploadParams): Promise<UploadResult>;
  getPublicUrl(bucket: string, path: string): string;
  getSignedUrl(bucket: string, path: string, expiresIn?: number): Promise<string>;
  delete(bucket: string, paths: string[]): Promise<void>;
  list(bucket: string, folder?: string): Promise<FileInfo[]>;
}
