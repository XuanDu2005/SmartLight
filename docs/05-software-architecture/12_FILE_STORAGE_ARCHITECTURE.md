# 12 — File Storage Architecture

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document defines the **file storage strategy** for SmartLight: providers, upload flows, image optimization, lifecycle, and CDN.

---

## 2. Storage Principles

1. **Cloud-first** — managed object storage.
2. **Direct upload (preferred)** — files go client → storage directly when large.
3. **CDN by default** — assets served from edge.
4. **Optimize at storage** — transformations by the provider, not the API.
5. **Single source of truth** — `media_file` row owns the metadata.
6. **Provider-agnostic** — backend uses Port; provider swappable.

---

## 3. Storage Provider Roadmap

| Phase | Primary | Secondary |
|---|---|---|
| **V1 (MVP)** | Cloudinary | — |
| **V1.5** | Cloudinary | (s3-compatible MinIO optional for self-hosted) |
| **V2** | AWS S3 | Cloudinary (image hot path); MinIO (self-hosted) |

---

## 4. Cloudinary Setup (MVP)

### 4.1 Account Tiers

- Free or Plus tier initially
- Reasonable transform quota
- CDN included

### 4.2 Configuration

| Setting | Value |
|---|---|
| Cloud name | `<cloud_name>` (env var) |
| API key | `<api_key>` (env var) |
| API secret | `<api_secret>` (env var) |
| Upload preset | (per use-case) |
| Default folder | `smartlight/` |
| Auto-backup | Enabled |
| Auto-tagging | Enabled |

---

## 5. Asset Types

| Type | Examples | Mime | Max Size |
|---|---|---|---|
| `product_image` | hero, gallery | jpg/png/webp | 10 MB |
| `product_video` | short clips | mp4 | 50 MB (V1.1) |
| `category_image` | icon/banner | png/webp | 2 MB |
| `brand_logo` | logo | png/svg | 1 MB |
| `avatar` | user/admin | jpg/png | 2 MB |
| `review_image` | uploaded by customer | jpg/png | 5 MB |
| `support_attachment` | screenshots | jpg/png/pdf | 10 MB |
| `email_asset` | inline email images | png/jpg | 500 KB |
| `static_page_asset` | CMS content | jpg/png | 5 MB |

---

## 6. Media Module

### 6.1 Responsibilities

- Metadata tracking (`media_file` table)
- Upload coordination (direct + indirect)
- Variant generation (delegated to provider)
- Lifecycle management (soft delete, retention)

### 6.2 Domain Aggregate

```
class MediaFile {
  readonly id: UUID;
  readonly providerId: string;          // provider-side ID
  readonly url: string;                 // canonical URL
  readonly secureUrl: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly width?: number;
  readonly height?: number;
  readonly purpose: MediaPurpose;
  readonly ownerType: string;           // 'product', 'user', etc.
  readonly ownerId: UUID;
  readonly providerCode: string;        // 'cloudinary' | 's3' | etc.
  readonly metadata: JSON;
  readonly status: 'uploading' | 'ready' | 'failed' | 'deleted';
  readonly createdBy: UUID;
  readonly createdAt: Date;
  readonly deletedAt: Date?;
}
```

### 6.3 Public Service

```
class MediaService {
  upload(input: UploadMediaInput, actor): Promise<MediaFile>;
  requestSignedUpload(input: SignedUploadRequest, actor): Promise<SignedUploadUrl>;  // for large files
  findById(id: UUID): Promise<MediaFile>;
  findByOwner(ownerType: string, ownerId: UUID): Promise<MediaFile[]>;
  getVariants(mediaId: UUID): Promise<MediaVariant[]>;
  softDelete(id: UUID, actor): Promise<void>;
}
```

---

## 7. Upload Flows

### 7.1 Indirect Upload (Small Files)

```
Client                 API                      Cloudinary
  │                     │                            │
  │ 1. POST /v1/media  │                            │
  │ (file + metadata)   │                            │
  ├────────────────────▶│                            │
  │                     │ 2. Validate                │
  │                     │ 3. Upload to Cloudinary    │
  │                     ├───────────────────────────▶│
  │                     │ 4. public_id, url          │
  │                     │◀───────────────────────────┤
  │ 5. Return           │                            │
  │    MediaFile JSON   │                            │
  │◀────────────────────┤                            │
  │                     │                            │
  │ 6. Persist          │                            │
  │ media_file row      │                            │
  │ (in same request)   │                            │
```

Used for: avatars, small product images, support attachments.

### 7.2 Direct Upload (Large Files)

```
Client                 API                      Cloudinary
  │                     │                            │
  │ 1. POST /v1/media   │                            │
  │ /signed-upload      │                            │
  ├────────────────────▶│                            │
  │                     │ 2. Validate metadata      │
  │                     │ 3. Generate signed URL     │
  │ 4. Return URL       │                            │
  │    + fields         │                            │
  │◀────────────────────┤                            │
  │                                                 │
  │ 5. Direct upload                                   │
  │ (multipart/form-data)                             │
  ├─────────────────────────────────────────────────▶│
  │ 6. Finalize                                      │
  │ POST /v1/media                                    │
  │ /confirm (with providerId)                        │
  ├────────────────────▶│                            │
  │                     │ 7. Verify                  │
  │                     │ 8. Persist metadata        │
  │ 9. Return           │                            │
  │    MediaFile JSON   │                            │
  │◀────────────────────┤                            │
```

Used for: product videos, large images.

### 7.3 File Validation

```
- Mime type whitelist (per purpose)
- Size limit (per purpose)
- Filename sanitization
- Virus scan (Cloudinary AI + ClamAV V1.5)
- Mime sniffing (don't trust user)
```

---

## 8. Image Optimization

### 8.1 Transformations

Cloudinary supports on-the-fly transformations via URL:

```
https://res.cloudinary.com/{cloud}/image/upload/
  w_{width},h_{height},c_{crop},q_{quality},f_{format}/
  {public_id}.{ext}
```

| Transformation | Use Case |
|---|---|
| `w_800,q_auto:best,f_auto` | Product gallery |
| `w_400,h_400,c_fill,q_auto,f_auto` | Product card |
| `w_100,h_100,c_fill` | Thumbnail |
| `w_1920,f_auto` | Hero banner |
| `c_thumb,w_300,h_300` | Category icon |
| `f_auto` | Auto-format (WebP/AVIF when supported) |
| `fl_progressive` | Progressive loading |
| `q_auto:eco` | Eco mode for low-bandwidth |

### 8.2 Lazy vs Eager Transformations

- **Lazy** (default): transformations on-demand; cached by CDN.
- **Eager**: pre-computed; for predictable hot assets.

Eager used for:
- Product gallery main image (3 sizes)
- Brand logo (3 sizes)
- Category icon (2 sizes)

### 8.3 Responsive Images

Use `<picture>` element with `srcset`:

```html
<picture>
  <source srcset="...?w=400 1x, ...?w=800 2x" media="(min-width: 768px)">
  <img src="...?w=400" alt="..." loading="lazy">
</picture>
```

---

## 9. CDN Strategy

### 9.1 V1

| Concern | CDN |
|---|---|
| Frontend static | Vercel CDN |
| API responses | Vercel Edge Cache (V1.5+) |
| Media files | Cloudinary CDN |

### 9.2 Vercel CDN

- Static assets: cached at edge
- Dynamic API: stale-while-revalidate for public endpoints

### 9.3 Cloudinary CDN

- All transformations served from edge
- Browser cache via `Cache-Control: public, max-age=31536000, immutable`

---

## 10. Storage Adapter

### 10.1 Port (Domain)

```
interface StoragePort {
  upload(buffer: Buffer, options: UploadOptions): Promise<StorageResult>;
  getUrl(publicId: string, transformations?: TransformOptions): string;
  delete(publicId: string): Promise<void>;
  generateSignedUpload(options: SignedUploadOptions): Promise<SignedUploadResult>;
}
```

### 10.2 Cloudinary Adapter (Infrastructure)

```
class CloudinaryStorageAdapter implements StoragePort {
  async upload(buffer, options) { /* Cloudinary SDK */ }
  getUrl(publicId, transformations) { /* build CDN URL */ }
  async delete(publicId) { /* Cloudinary destroy */ }
  async generateSignedUpload(options) { /* signed upload params */ }
}
```

### 10.3 Future S3 Adapter (Infrastructure, V2)

```
class S3StorageAdapter implements StoragePort { /* AWS SDK */ }
class MinIOStorageAdapter implements StoragePort { /* MinIO SDK */ }
```

Provider swappable via DI token `STORAGE_PORT`.

---

## 11. Lifecycle Management

### 11.1 Retention

| Asset | Retention After Delete |
|---|---|
| Product images | Soft-deleted; purged after 90 days |
| User avatars | Soft-deleted; purged after 30 days |
| Temp uploads | Hard-deleted after 24h |
| Email assets | Indefinite |
| Backup | Daily snapshots; retained 30 days |

### 11.2 Soft Delete

`media_file.deleted_at` set; serving URL returns 404; hard delete after retention.

### 11.3 Orphan Sweep

Daily job:
- Find `media_file` rows where `ownerType/ownerId` no longer references valid entity
- Soft-delete orphans
- Hard-purge after retention

---

## 12. Image Search / Browse

| Concern | Mechanism |
|---|---|
| Tag-based browse | Cloudinary's `tags` field; auto-tagging on upload |
| Visual similarity (V2) | ML feature vectors; optional |

---

## 13. Multi-Purpose Image Routing

URL helpers in the application:

```
getProductMainImageUrl(productId, size: 'sm'|'md'|'lg')
getAvatarUrl(userId, size: 'sm'|'md'|'lg')
getBrandLogoUrl(brandId)
getCategoryIconUrl(categoryId)
```

> Helpers centralized in `media/urls.ts` to ensure consistency.

---

## 14. Compliance

### 14.1 Privacy

- User-uploaded content (review images) subject to PDPD
- Removal on user request via `/users/me/media` DELETE
- Audit logs for all uploads/deletes

### 14.2 Copyright

- Watermarking (V1.5+) for product images
- DMCA-style takedown process

### 14.3 Storage Location

For V1, data may reside in Singapore or another SEA region (Upstash/Cloudinary default). For strict Vietnamese data residency, swap to local MinIO in V2.

---

## 15. Coverage Validation

| Check | Status |
|---|---|
| Provider roadmap | ✓ |
| Asset types and limits | ✓ |
| Media module responsibilities | ✓ |
| Upload flows (direct + indirect) | ✓ |
| Image optimization (transformations) | ✓ |
| CDN strategy | ✓ |
| Adapter pattern (Port + Cloudinary) | ✓ |
| Lifecycle and soft delete | ✓ |
| Compliance | ✓ |

---

## 16. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial file storage architecture: Cloudinary MVP + future S3/MinIO |

---

**End of 12_FILE_STORAGE_ARCHITECTURE.md**