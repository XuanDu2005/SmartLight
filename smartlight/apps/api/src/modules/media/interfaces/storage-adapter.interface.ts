/**
 * Media storage adapter contract.
 *
 * Implementations upload bytes / delete files at a third-party provider
 * (Cloudinary, S3, ...) and return a canonical URL + asset id. The MediaFile
 * row in Postgres is the source of truth; the provider is replaceable.
 */
import type { Readable } from 'node:stream';

export interface StorageUploadInput {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  /** Free-form key/value metadata stored alongside the asset. */
  metadata?: Record<string, string>;
  /** Optional folder/prefix on the provider side. */
  folder?: string;
}

export interface StorageUploadResult {
  providerAssetId: string;
  url: string;
  secureUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  variants: Record<string, unknown>;
  checksum: string | null;
}

export interface StorageDeleteResult {
  success: boolean;
  providerAssetId: string;
}

export interface StorageSignedUrlInput {
  url: string;
  ttlSec: number;
}

export interface StorageSignedUrlResult {
  url: string;
  expiresAt: Date;
}

export interface IStorageAdapter {
  /** Provider name persisted in MediaFile.provider. */
  readonly providerName: string;

  upload(input: StorageUploadInput): Promise<StorageUploadResult>;

  delete(providerAssetId: string): Promise<StorageDeleteResult>;

  signUrl(input: StorageSignedUrlInput): Promise<StorageSignedUrlResult>;

  /**
   * Stream helper for multipart handlers — abstract so a future S3 adapter
   * can use a multipart upload pipeline. The default local adapter can
   * simply read the stream into a buffer.
   */
  uploadStream?(
    stream: Readable,
    contentLength: number,
    mimeType: string,
    filename: string,
    metadata?: Record<string, string>,
  ): Promise<StorageUploadResult>;
}

export const STORAGE_ADAPTER = Symbol('STORAGE_ADAPTER');
