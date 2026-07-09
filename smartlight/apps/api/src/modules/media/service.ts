/**
 * MediaService \u2014 orchestrates upload, listing, attachment, deletion, and
 * signed-URL minting for the media bounded context.
 *
 * Internal service contract:
 *   - uploadBuffer({ buffer, mimeType, filename, ... }) \u2192 MediaFile row
 *   - uploadFromUrl({ url, mimeType, ... })            \u2192 MediaFile row (server-side fetch)
 *   - attach({ mediaId, ownerType, ownerId })         \u2192 updates ownership
 *   - softDelete(id)                                  \u2192 sets deletedAt + tries provider delete
 *   - mintSignedUrl(id, ttlSec)                       \u2192 { url, expiresAt }
 *   - getMedia(id) / listMedia(filter)                \u2192 reads
 *
 * Money: N/A (no monetary values stored).
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { MediaPurpose } from '@prisma/client';

import { MediaRepository } from './repositories/media.repository';
import {
  IStorageAdapter,
  STORAGE_ADAPTER,
} from './interfaces/storage-adapter.interface';
import {
  MEDIA_CONSTANTS,
  MEDIA_ERROR_CODES,
  type MediaErrorCode,
} from './constants/media.constants';
import {
  InvalidMimeTypeException,
  MediaDeleteFailedException,
  MediaFileNotFoundException,
  MediaUploadFailedException,
  SignedUrlFailedException,
} from './exceptions/media.exceptions';

import type {
  CreateMediaFromUrlDto,
  AttachMediaDto,
  ListMediaQueryDto,
} from './dto/media.dto';
import type {
  MediaFileResponseDto,
  MediaListResponseDto,
  MediaUploadResponseDto,
  SignedUrlResponseDto,
} from './dto/media-response.dto';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly repo: MediaRepository,
    @Inject(STORAGE_ADAPTER) private readonly storage: IStorageAdapter,
  ) {}

  /* ============================================================== */
  /*  Public API                                                     */
  /* ============================================================== */

  async uploadBuffer(args: {
    buffer: Buffer;
    mimeType: string;
    filename: string;
    ownerType?: string;
    ownerId?: string;
    purpose?: string;
    createdById?: string;
  }): Promise<MediaUploadResponseDto> {
    this.assertMimeType(args.mimeType);

    const upload = await this.storage.upload({
      buffer: args.buffer,
      mimeType: args.mimeType,
      filename: args.filename,
      metadata: {
        ownerType: args.ownerType ?? '',
        ownerId: args.ownerId ?? '',
      },
      folder: args.purpose ?? 'smartlight',
    });

    const row = await this.repo.create({
      provider: this.storage.providerName,
      providerAssetId: upload.providerAssetId,
      url: upload.url,
      secureUrl: upload.secureUrl,
      mimeType: upload.mimeType,
      sizeBytes: BigInt(upload.sizeBytes),
      width: upload.width,
      height: upload.height,
      durationSeconds: upload.durationSeconds,
      purpose: (args.purpose as MediaPurpose | undefined) ?? null,
      variantsJson: (upload.variants as any) ?? {},
      checksum: upload.checksum,
      ownerType: args.ownerType ?? null,
      ownerId: args.ownerId ?? null,
      createdById: args.createdById ?? null,
    });

    return this.toResponse(row);
  }

  async uploadFromUrl(
    dto: CreateMediaFromUrlDto,
    createdById: string,
  ): Promise<MediaUploadResponseDto> {
    this.assertMimeType(dto.mimeType);

    let response: Response;
    try {
      response = await fetch(dto.url);
    } catch (err) {
      throw new MediaUploadFailedException(
        `fetch: ${(err as Error).message ?? 'unknown'}`,
      );
    }
    if (!response.ok) {
      throw new MediaUploadFailedException(
        `upstream ${response.status} for ${dto.url}`,
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = this.deriveFilename(dto.url, dto.mimeType);

    const inferredMime =
      response.headers.get('content-type')?.split(';')[0]?.trim() ??
      dto.mimeType;

    return this.uploadBuffer({
      buffer,
      mimeType: inferredMime,
      filename,
      ownerType: dto.ownerType,
      ownerId: dto.ownerId,
      purpose: dto.purpose,
      createdById,
    });
  }

  async attach(dto: AttachMediaDto): Promise<MediaFileResponseDto> {
    const existing = await this.repo.findById(dto.mediaId);
    if (!existing) throw new MediaFileNotFoundException(dto.mediaId);

    const updated = await this.repo.attachOwner({
      id: dto.mediaId,
      ownerType: dto.ownerType,
      ownerId: dto.ownerId ?? null,
    });
    return this.toResponse(updated);
  }

  async getMedia(id: string): Promise<MediaFileResponseDto> {
    const row = await this.repo.findById(id);
    if (!row) throw new MediaFileNotFoundException(id);
    return this.toResponse(row);
  }

  async listMedia(query: ListMediaQueryDto): Promise<MediaListResponseDto> {
    const { page, limit } = this.repo.parsePagination(query.page, query.limit);
    const { items, total } = await this.repo.list({
      ownerType: query.ownerType,
      ownerId: query.ownerId,
      purpose: query.purpose,
      page,
      limit,
    });
    return {
      items: items.map((r: any) => this.toResponse(r)),
      total,
      page,
      limit,
    };
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new MediaFileNotFoundException(id);

    // Best-effort provider delete
    try {
      await this.storage.delete(existing.providerAssetId);
    } catch (err) {
      this.logger.warn(
        `Provider delete failed for ${id} (${existing.providerAssetId}): ${
          (err as Error).message ?? 'unknown'
        }`,
      );
    }
    await this.repo.softDelete(id);
  }

  async mintSignedUrl(
    id: string,
    ttlSec: number = MEDIA_CONSTANTS.SIGNED_URL_TTL_SEC,
  ): Promise<SignedUrlResponseDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new MediaFileNotFoundException(id);

    const result = await this.storage.signUrl({
      url: existing.secureUrl,
      ttlSec,
    });
    return {
      url: result.url,
      expiresAt: result.expiresAt.toISOString(),
    };
  }

  /* ============================================================== */
  /*  Internal helpers                                               */
  /* ============================================================== */

  private assertMimeType(mime: string): void {
    const allowed = MEDIA_CONSTANTS.ALLOWED_MIME_TYPES as readonly string[];
    if (!allowed.includes(mime)) {
      throw new InvalidMimeTypeException(mime, [...allowed]);
    }
  }

  private deriveFilename(url: string, mimeType: string): string {
    try {
      const u = new URL(url);
      const last = u.pathname.split('/').filter(Boolean).pop();
      if (last) return last;
    } catch {
      // not a URL \u2014 fall through
    }
    const ext = mimeType.split('/')[1] ?? 'bin';
    return `upload-${Date.now()}.${ext}`;
  }

  private toResponse(row: any): MediaFileResponseDto {
    return {
      id: row.id,
      provider: row.provider,
      providerAssetId: row.providerAssetId,
      url: row.url,
      secureUrl: row.secureUrl,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes.toString(),
      width: row.width ?? null,
      height: row.height ?? null,
      durationSeconds: row.durationSeconds ?? null,
      purpose: row.purpose ?? null,
      variants: (row.variantsJson as Record<string, unknown>) ?? {},
      checksum: row.checksum ?? null,
      ownerType: row.ownerType ?? null,
      ownerId: row.ownerId ?? null,
      createdById: row.createdById ?? null,
      uploadedAt: row.uploadedAt.toISOString(),
    };
  }
}