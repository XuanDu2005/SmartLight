# CATALOG_API.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document details the **Catalog API endpoints** for SmartLight, including categories, brands, products, variants, attributes, and the corresponding admin operations for managing the catalog.

---

## 2. Categories

### 2.1 EP-CAT-001 — List Categories (Flat)

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/categories` |
| **Authentication** | None (public) |
| **Cache** | public, max-age=3600 |
| **Related Use Case** | UC-CAT-006 |
| **Related Entity** | category |

**Query Parameters:**

| Name | Type | Description |
| --- | --- | --- |
| `parentId` | string | Filter by parent (null for roots) |
| `isActive` | boolean | Default true |
| `limit` | int | Default 100, max 500 (for tree) |
| `sort` | string | `displayOrder`, `-displayOrder`, `name` |

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "parentId": null,
      "name": "Đèn LED",
      "slug": "den-led",
      "description": "...",
      "displayOrder": 1,
      "isActive": true,
      "productCount": 245,
      "imageUrl": "https://cdn.smartlight.vn/..."
    }
  ],
  "meta": { "pagination": { ... } }
}
```

---

### 2.2 EP-CAT-002 — Get Category

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/categories/{categoryId}` |
| **Cache** | public, max-age=1800 |

**Response `200 OK`:** Full category object with children (1 level).

---

### 2.3 EP-CAT-003 — Get Category Tree

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/categories/tree` |
| **Cache** | public, max-age=3600 |

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "name": "Đèn LED",
      "slug": "den-led",
      "children": [
        { "id": "uuid", "name": "Đèn LED âm trần", "slug": "den-led-am-tran", "children": [] },
        { "id": "uuid", "name": "Đèn LED bulb", "slug": "den-led-bulb", "children": [] }
      ]
    }
  ]
}
```

---

### 2.4 Admin: EP-ADM-CAT-001 — Create Category

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/catalog/categories` |
| **Authentication** | Yes (CatalogManager+) |
| **Audit** | `category.created` |

**Request Body:**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `parentId` | string | No | Existing category UUID |
| `name` | string | Yes | Max 100 |
| `slug` | string | Yes | Unique; URL-safe |
| `description` | string | No | Max 2000 |
| `displayOrder` | int | No | Default 0 |
| `isActive` | boolean | No | Default true |
| `taxExempt` | boolean | No | Default false |
| `imageMediaId` | string | No | Existing media file |

**Response `201 Created`:** Category object.

**Business Rules:** BR-CAT-001, BR-TAX-003

---

### 2.5 Admin: EP-ADM-CAT-002 — Update Category

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/admin/catalog/categories/{categoryId}` |
| **Audit** | `category.updated` |

**Request:** Subset of create fields.

**Response `200 OK`:** Updated category.

---

### 2.6 Admin: EP-ADM-CAT-003 — Soft-Delete Category

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/admin/catalog/categories/{categoryId}` |
| **Audit** | `category.deleted` |

**Business Rule:** Cannot delete category with active products or children.

**Response:** `204 No Content`

**Errors:** `CATEGORY_HAS_PRODUCTS` (409), `CATEGORY_HAS_CHILDREN` (409)

---

### 2.7 Admin: EP-ADM-CAT-004 — Restore Category

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/catalog/categories/{categoryId}/restore` |
| **Audit** | `category.restored` |

**Response `200 OK`:** Restored category.

---

## 3. Brands

### 3.1 EP-CAT-011 — List Brands

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/brands` |
| **Authentication** | None |
| **Cache** | public, max-age=3600 |
| **Related Entity** | brand |

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "name": "Philips",
      "slug": "philips",
      "description": "...",
      "logo": { "url": "...", "altText": "..." },
      "isActive": true,
      "productCount": 245
    }
  ]
}
```

---

### 3.2 EP-CAT-012 — Get Brand

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/brands/{brandId}` |
| **Cache** | public, max-age=1800 |

**Response `200 OK`:** Brand with related products (optional `?includeProducts=true`).

---

### 3.3 Admin: EP-ADM-CAT-011 — Create Brand

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/catalog/brands` |
| **Audit** | `brand.created` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `name` | string | Yes |
| `slug` | string | Yes; auto-generated if omitted |
| `description` | string | No |
| `logoMediaId` | string | No |
| `isActive` | boolean | No (default true) |

**Response `201 Created`:** Brand.

---

### 3.4 Admin: EP-ADM-CAT-012 — Update Brand

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/admin/catalog/brands/{brandId}` |
| **Audit** | `brand.updated` |

---

### 3.5 Admin: EP-ADM-CAT-013 — Soft-Delete Brand

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/admin/catalog/brands/{brandId}` |

**Errors:** `BRAND_HAS_PRODUCTS` (409)

---

## 4. Products

### 4.1 EP-CAT-021 — List Products (Public Filter/Search)

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/products` |
| **Authentication** | None |
| **Cache** | public, max-age=60 |
| **Related Use Case** | UC-CAT-001, UC-CAT-008 |
| **Related Entity** | product |

**Query Parameters (extensive; see `FILTER_SORT_SEARCH.md`):**

| Name | Type | Description |
| --- | --- | --- |
| `categoryId` | string | Direct category |
| `categorySlug` | string | By slug |
| `brandId` | string | Direct brand |
| `brandSlug` | string | By slug |
| `status` | enum | `draft`, `published`, `unpublished`, `archived` (public: only `published`) |
| `minPrice` | int (xu) | Min price |
| `maxPrice` | int (xu) | Max price |
| `inStock` | boolean | Default false |
| `q` | string | Search by name |
| `attribute.{slug}` | string | Filter by attribute value |
| `featured` | boolean | Featured only |
| `newArrival` | boolean | New (last 30 days) |
| `sort` | enum | `priceAsc`, `priceDesc`, `nameAsc`, `createdDesc`, `bestSelling`, `topRated` |
| `page`, `limit` | int | Pagination |
| `fields` | string | Sparse fields |
| `include` | string | Related: `variants`, `images`, `brand`, `category`, `attributes`, `reviews` |

**Filter Operators:** Operators documented in `FILTER_SORT_SEARCH.md`.

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "slug": "den-led-am-tran-9w",
      "name": "Đèn LED âm trần 9W",
      "shortDescription": "...",
      "brand": { "id": "uuid", "name": "Philips", "slug": "philips" },
      "category": { "id": "uuid", "name": "Đèn LED", "slug": "den-led" },
      "primaryImage": { "url": "https://cdn.smartlight.vn/...", "altText": "..." },
      "basePrice": 20000000,
      "compareAtPrice": 25000000,
      "currency": "VND",
      "hasVariants": true,
      "priceRange": { "min": 18000000, "max": 25000000, "currency": "VND" },
      "inStock": true,
      "averageRating": 4.5,
      "reviewCount": 23,
      "createdAt": "...",
      "publishedAt": "..."
    }
  ],
  "meta": {
    "pagination": { "page": 1, "limit": 20, "totalItems": 245, "totalPages": 13 },
    "filters": { "appliedFilters": ["categoryId", "brandId"] }
  }
}
```

---

### 4.2 EP-CAT-022 — Get Product

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/products/{productId}` |
| **Cache** | public, max-age=300 |

**Query Parameters:**

| Name | Description |
| --- | --- |
| `include` | `variants`, `images`, `attributes`, `reviews` (default: variants, images, attributes) |

**Response `200 OK`:** Full product with related resources.

---

### 4.3 EP-CAT-023 — Get Product Variants

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/products/{productId}/variants` |
| **Cache** | public, max-age=300 |

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "sku": "LT-LED-A19-WW",
      "barcode": null,
      "name": "Warm White",
      "price": 20000000,
      "compareAtPrice": 25000000,
      "currency": "VND",
      "weight": 250,
      "inStock": true,
      "stockCount": 45,
      "lowStock": false,
      "attributes": [
        { "name": "color", "value": "Warm White" },
        { "name": "wattage", "value": "9W" }
      ],
      "imageUrl": "https://cdn.smartlight.vn/..."
    }
  ]
}
```

---

### 4.4 EP-CAT-024 — Get Product Images

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/products/{productId}/images` |
| **Cache** | public, max-age=600 |

**Response `200 OK`:** List of image objects with multiple variant URLs.

---

### 4.5 EP-CAT-025 — Get Product Reviews

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/products/{productId}/reviews` |

**Response `200 OK`:** Paginated reviews.

See `REVIEW_API.md`.

---

### 4.6 EP-CAT-026 — Get Product by Slug

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/products/slug/{slug}` |

Used for SEO-friendly URLs.

**Response:** Same as `EP-CAT-022`.

---

### 4.7 EP-CAT-027 — Featured Products

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/products/featured` |
| **Cache** | public, max-age=300 |

**Query Parameters:** `limit` (default 12, max 50)

**Response:** List of featured products.

---

### 4.8 EP-CAT-028 — Best Sellers

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/products/best-sellers` |
| **Cache** | public, max-age=600 |

**Query Parameters:** `limit`, `period` (`day` | `week` | `month` | `all`)

---

### 4.9 EP-CAT-029 — New Arrivals

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/products/new-arrivals` |
| **Cache** | public, max-age=600 |

**Query Parameters:** `limit` (default 12)

---

### 4.10 Admin: EP-ADM-CAT-021 — Create Product

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/catalog/products` |
| **Audit** | `product.created` |
| **Idempotency** | Required |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `name` | string | Yes; max 255 |
| `slug` | string | Optional; auto |
| `categoryId` | string | Yes |
| `brandId` | string | Yes |
| `shortDescription` | string | No; max 500 |
| `description` | string | No |
| `status` | enum | `draft` \| `published` \| `unpublished` \| `archived`; default `draft` |
| `basePrice` | int (xu) | Yes (if no variants) |
| `currency` | string | Default `VND` |
| `weight` | decimal | No; kg |
| `hasVariants` | boolean | Yes (must include variants array) |
| `variants` | array | Yes if hasVariants |
| `attributeValues` | array | No |
| `imageMediaIds` | array | No (upload via /v1/media first) |
| `seo` | object | No; metaTitle, metaDescription |

**Response `201 Created`:** Product.

---

### 4.11 Admin: EP-ADM-CAT-022 — Update Product

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/admin/catalog/products/{productId}` |
| **Audit** | `product.updated` |

**Request:** Subset of create fields.

---

### 4.12 Admin: EP-ADM-CAT-023 — Soft-Delete Product

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/admin/catalog/products/{productId}` |
| **Audit** | `product.deleted` |

**Business Rules:** Cannot delete product with active orders; reservations cancelled.

**Response:** `204 No Content`

---

### 4.13 Admin: EP-ADM-CAT-024 — Publish Product

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/catalog/products/{productId}/publish` |
| **Audit** | `product.published` |

**Response `200 OK`:** Product with `status: 'published'`, `publishedAt: ...`.

---

### 4.14 Admin: EP-ADM-CAT-025 — Unpublish Product

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/catalog/products/{productId}/unpublish` |
| **Audit** | `product.unpublished` |

---

### 4.15 Admin: EP-ADM-CAT-026 — Restore Product

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/catalog/products/{productId}/restore` |
| **Audit** | `product.restored` |

---

### 4.16 Admin: EP-ADM-CAT-027 — Bulk Publish

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/catalog/products/bulk-publish` |
| **Idempotency** | Required |
| **Audit** | `product.bulk_published` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `ids` | array of string | Yes |

**Response `200 OK`:** Bulk response with succeeded/failed.

---

### 4.17 Admin: EP-ADM-CAT-028 — Bulk Unpublish

Like publish but `unpublished` event.

---

## 5. Product Variants

### 5.1 Public: EP-CAT-031 — Get Variant

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/products/{productId}/variants/{variantId}` |

---

### 5.2 Admin: EP-ADM-CAT-031 — Create Variant

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/catalog/products/{productId}/variants` |
| **Audit** | `variant.created` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `sku` | string | Yes; unique |
| `barcode` | string | No |
| `price` | int (xu) | Yes |
| `compareAtPrice` | int | No |
| `costPrice` | int | No (admin-only) |
| `weight` | decimal | No |
| `lowStockThreshold` | int | Default 5 |
| `attributeValues` | array | Yes |
| `imageMediaIds` | array | No |

---

### 5.3 Admin: EP-ADM-CAT-032 — Update Variant

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/admin/catalog/products/{productId}/variants/{variantId}` |
| **Audit** | `variant.updated` |

---

### 5.4 Admin: EP-ADM-CAT-033 — Delete Variant

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/admin/catalog/products/{productId}/variants/{variantId}` |
| **Audit** | `variant.deleted` |

**Constraint:** Cannot delete variant in active orders; reservations cancelled.

---

### 5.5 Admin: EP-ADM-CAT-034 — Update Variant Price

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/catalog/products/{productId}/variants/{variantId}/price` |
| **Audit** | `variant.price_changed` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `price` | int | Yes |
| `compareAtPrice` | int | No |
| `effectiveAt` | timestamp | No (default now) |

---

## 6. Product Attributes

### 6.1 EP-CAT-041 — List Attributes

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/attributes` |
| **Cache** | public, max-age=1800 |

**Response:**

```
{
  "data": [
    { "id": "uuid", "name": "color", "displayName": "Màu sắc", "type": "text", "values": ["Warm White", "Cool White"] },
    { "id": "uuid", "name": "wattage", "displayName": "Công suất", "type": "number", "values": [9, 12, 18] }
  ]
}
```

---

### 6.2 Admin: EP-ADM-CAT-041 — Create Attribute

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/catalog/attributes` |

---

### 6.3 Admin: EP-ADM-CAT-042 — Update Attribute

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/admin/catalog/attributes/{attributeId}` |

---

### 6.4 Admin: EP-ADM-CAT-043 — Delete Attribute

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/admin/catalog/attributes/{attributeId}` |

---

## 7. Response Examples

### 7.1 Product (Detail)

```
{
  "data": {
    "id": "uuid",
    "name": "Đèn LED âm trần 9W Philips",
    "slug": "den-led-am-tran-9w-philips",
    "shortDescription": "Đèn LED tiết kiệm điện...",
    "description": "<p>...</p>",
    "status": "published",
    "brand": { "id": "uuid", "name": "Philips", "slug": "philips" },
    "category": { "id": "uuid", "name": "Đèn LED âm trần", "slug": "den-led-am-tran" },
    "primaryImage": {
      "id": "uuid",
      "url": "https://cdn.smartlight.vn/x9j4k2l.jpg",
      "altText": "Đèn LED âm trần 9W",
      "variants": [
        { "name": "thumbnail", "url": "...", "width": 200 },
        { "name": "medium", "url": "...", "width": 800 },
        { "name": "large", "url": "...", "width": 1600 }
      ]
    },
    "images": [...],
    "variants": [
      {
        "id": "uuid",
        "sku": "LT-LED-A19-WW-9W",
        "price": 20000000,
        "compareAtPrice": 25000000,
        "currency": "VND",
        "inStock": true,
        "stockCount": 45,
        "attributes": [
          { "name": "color", "value": "Warm White" },
          { "name": "wattage", "value": "9W" }
        ]
      }
    ],
    "attributes": [...],
    "averageRating": 4.5,
    "reviewCount": 23,
    "publishedAt": "2026-06-01T00:00:00Z",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### 7.2 Product (Listing)

```
{
  "data": [
    {
      "id": "uuid",
      "name": "Đèn LED âm trần 9W Philips",
      "slug": "den-led-am-tran-9w-philips",
      "primaryImage": { "url": "...", "altText": "..." },
      "brand": { "id": "uuid", "name": "Philips" },
      "priceRange": { "min": 18000000, "max": 25000000, "currency": "VND" },
      "inStock": true,
      "averageRating": 4.5,
      "reviewCount": 23
    }
  ],
  "meta": {
    "pagination": { "page": 1, "limit": 20, "totalItems": 245, "totalPages": 13 },
    "filters": { "appliedFilters": { "categoryId": ["uuid"], "inStock": true } }
  }
}
```

---

## 8. Cross-References

| Field | Reference |
| --- | --- |
| Use Cases | UC-CAT-001..010 |
| Business Rules | BR-CAT-001..010 |
| Workflows | WF-CAT-01..05 |
| Features | SF-CAT-001..014 |
| Entities | category, brand, product, product_variant, product_image, product_attribute |

---

## 9. Coverage Validation

| Check | Status |
| --- | --- |
| Categories CRUD + admin | ✓ |
| Brands CRUD + admin | ✓ |
| Products CRUD + admin | ✓ |
| Product variants CRUD + admin | ✓ |
| Attributes CRUD + admin | ✓ |
| Cache strategy aligned | ✓ |
| Search/filter/sort exposed | ✓ |
| Special listing endpoints (featured, best-sellers, new-arrivals) | ✓ |
| Slug-based routing | ✓ |
| Bulk operations | ✓ |
| Audit logging specified | ✓ |

---

## 10. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial catalog API: 33 endpoints across categories, brands, products, variants, attributes |

---

**End of Document — CATALOG_API.md**