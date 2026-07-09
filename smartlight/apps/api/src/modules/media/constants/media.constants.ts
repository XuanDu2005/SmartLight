/**
 * Media domain constants.
 */
export const MEDIA_CONSTANTS = {
  /** Default allowed mime types. */
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ] as const,

  /** Default max upload size in bytes (25 MB). */
  MAX_UPLOAD_BYTES: 25 * 1024 * 1024,

  /** Default signed-URL TTL in seconds (10 min). */
  SIGNED_URL_TTL_SEC: 600,

  /** Default page size for admin listings. */
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 200,

  /** Provider keys (kept in sync with the MediaFile.provider column). */
  PROVIDER_CLOUDINARY: 'cloudinary',
  PROVIDER_LOCAL: 'local',

  /** Owner types (free-text tag used by MediaFile.ownerType). */
  OWNER_PRODUCT: 'product',
  OWNER_CATEGORY: 'category',
  OWNER_BRAND: 'brand',
  OWNER_USER: 'user',
  OWNER_REVIEW: 'review',
  OWNER_STATIC: 'static',
} as const;

export type MediaOwnerType =
  | 'product'
  | 'category'
  | 'brand'
  | 'user'
  | 'review'
  | 'static'
  | string;

export const MEDIA_ERROR_CODES = {
  FILE_NOT_FOUND: 'MEDIA_FILE_NOT_FOUND',
  INVALID_MIME_TYPE: 'MEDIA_INVALID_MIME_TYPE',
  FILE_TOO_LARGE: 'MEDIA_FILE_TOO_LARGE',
  UPLOAD_FAILED: 'MEDIA_UPLOAD_FAILED',
  DELETE_FAILED: 'MEDIA_DELETE_FAILED',
  SIGNED_URL_FAILED: 'MEDIA_SIGNED_URL_FAILED',
  INVALID_OWNER_TYPE: 'MEDIA_INVALID_OWNER_TYPE',
} as const;

export type MediaErrorCode =
  (typeof MEDIA_ERROR_CODES)[keyof typeof MEDIA_ERROR_CODES];