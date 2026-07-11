/**
 * Media response DTOs.
 */

export interface MediaFileResponseDto {
  id: string;
  provider: string;
  providerAssetId: string | null;
  url: string;
  secureUrl: string;
  mimeType: string;
  sizeBytes: string;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  purpose: string | null;
  variants: Record<string, unknown>;
  checksum: string | null;
  ownerType: string | null;
  ownerId: string | null;
  createdById: string | null;
  uploadedAt: string;
}

export interface MediaListResponseDto {
  items: MediaFileResponseDto[];
  total: number;
  page: number;
  limit: number;
}

export interface MediaUploadResponseDto extends MediaFileResponseDto {
  /** Signed URL the client should use to upload (PUT) when using the local provider. */
  uploadUrl?: string;
  /** Optional HTTP headers the client must include when uploading. */
  uploadHeaders?: Record<string, string>;
}

export interface SignedUrlResponseDto {
  url: string;
  expiresAt: string;
}
