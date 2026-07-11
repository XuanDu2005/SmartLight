/**
 * Cloudinary storage adapter.
 *
 * Uses Cloudinary's REST upload API directly (no SDK) to keep the
 * dependency surface small. If credentials are missing the adapter
 * throws a clear error at construction time so the AppModule fails fast.
 *
 * Auth:
 *   POST https://api.cloudinary.com/v1_1/{cloud_name}/auto/upload
 *   body: multipart/form-data, includes `api_key`, `timestamp`, `signature`
 *
 * For the V1 release, signed-URL generation uses Cloudinary's
 * `image/authenticated` delivery type with a backend-computed signature.
 */
import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';

import {
  FileTooLargeException,
  MediaUploadFailedException,
  SignedUrlFailedException,
} from '../exceptions/media.exceptions';
import { MEDIA_CONSTANTS } from '../constants/media.constants';
import type {
  IStorageAdapter,
  StorageDeleteResult,
  StorageSignedUrlInput,
  StorageSignedUrlResult,
  StorageUploadInput,
  StorageUploadResult,
} from '../interfaces/storage-adapter.interface';

interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

@Injectable()
export class CloudinaryStorageAdapter implements IStorageAdapter {
  readonly providerName = MEDIA_CONSTANTS.PROVIDER_CLOUDINARY;
  private readonly logger = new Logger(CloudinaryStorageAdapter.name);
  private readonly creds: CloudinaryCredentials;

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';
    const apiKey = process.env.CLOUDINARY_API_KEY ?? '';
    const apiSecret = process.env.CLOUDINARY_API_SECRET ?? '';

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn(
        'Cloudinary credentials missing \u2014 uploads will fail. ' +
          'Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET.',
      );
    }

    this.creds = { cloudName, apiKey, apiSecret };
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    this.assertCreds();

    if (input.buffer.byteLength > MEDIA_CONSTANTS.MAX_UPLOAD_BYTES) {
      throw new FileTooLargeException(
        input.buffer.byteLength,
        MEDIA_CONSTANTS.MAX_UPLOAD_BYTES,
      );
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = input.folder ?? 'smartlight';
    const signature = this.sign({ folder, timestamp });

    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }), input.filename);
    formData.append('api_key', this.creds.apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', folder);

    let response: Response;
    try {
      response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.creds.cloudName}/auto/upload`,
        { method: 'POST', body: formData },
      );
    } catch (err) {
      throw new MediaUploadFailedException(
        `network: ${(err as Error).message ?? 'unknown'}`,
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw new MediaUploadFailedException(
        `cloudinary ${response.status}: ${text.slice(0, 200)}`,
      );
    }

    const json = (await response.json()) as Record<string, unknown>;
    return this.toUploadResult(json, input);
  }

  async delete(providerAssetId: string): Promise<StorageDeleteResult> {
    this.assertCreds();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.sign({ public_id: providerAssetId, timestamp });

    const formData = new URLSearchParams();
    formData.append('public_id', providerAssetId);
    formData.append('api_key', this.creds.apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.creds.cloudName}/auto/destroy`,
        { method: 'POST', body: formData.toString() },
      );
      if (!response.ok) {
        const text = await response.text();
        this.logger.warn(`Cloudinary delete ${response.status}: ${text.slice(0, 200)}`);
        return { success: false, providerAssetId };
      }
      const json = (await response.json()) as { result?: string };
      return { success: json.result === 'ok', providerAssetId };
    } catch (err) {
      this.logger.warn(
        `Cloudinary delete failed: ${(err as Error).message ?? 'unknown'}`,
      );
      return { success: false, providerAssetId };
    }
  }

  async signUrl(input: StorageSignedUrlInput): Promise<StorageSignedUrlResult> {
    this.assertCreds();
    const expiresAt = new Date(Date.now() + input.ttlSec * 1000);

    try {
      const expiresAtUnix = Math.floor(expiresAt.getTime() / 1000);
      const signature = this.sign({ expires_at: expiresAtUnix.toString() });

      // Inject `expires_at` + signature into the query string.
      const url = new URL(input.url);
      url.searchParams.set('expires_at', expiresAtUnix.toString());
      url.searchParams.set('signature', signature);
      url.searchParams.set('api_key', this.creds.apiKey);

      return { url: url.toString(), expiresAt };
    } catch (err) {
      throw new SignedUrlFailedException(
        (err as Error).message ?? 'unknown',
      );
    }
  }

  /* ---------------- internals ---------------- */

  private assertCreds(): void {
    if (!this.creds.cloudName || !this.creds.apiKey || !this.creds.apiSecret) {
      throw new MediaUploadFailedException(
        'cloudinary credentials not configured',
      );
    }
  }

  private sign(parts: Record<string, string>): string {
    const sorted = Object.keys(parts)
      .sort()
      .map((k) => `${k}=${parts[k]}`)
      .join('&');
    const toSign = `${sorted}${this.creds.apiSecret}`;
    return crypto.createHash('sha256').update(toSign).digest('hex');
  }

  private toUploadResult(
    json: Record<string, unknown>,
    input: StorageUploadInput,
  ): StorageUploadResult {
    const width = (json.width as number | undefined) ?? null;
    const height = (json.height as number | undefined) ?? null;
    const durationSeconds =
      (json.duration as number | undefined) ?? null;
    const variants = (json.eager as unknown[] | undefined) ?? {};
    const checksum =
      (json.etag as string | undefined) ?? null;

    return {
      providerAssetId: (json.public_id as string) ?? input.filename,
      url: (json.url as string) ?? '',
      secureUrl: (json.secure_url as string) ?? '',
      mimeType: input.mimeType,
      sizeBytes: (json.bytes as number | undefined) ?? input.buffer.byteLength,
      width,
      height,
      durationSeconds,
      variants: variants as Record<string, unknown>,
      checksum,
    };
  }
}
