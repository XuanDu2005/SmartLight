# OPENAPI_PREPARATION.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document defines the **OpenAPI preparation strategy** for SmartLight. Although the actual OpenAPI 3.1 spec generation is deferred to a later phase, this document establishes the metadata, schemas, and structure required for future automatic generation.

---

## 2. OpenAPI Overview

| Aspect | Decision |
| --- | --- |
| Specification | OpenAPI 3.1.0 |
| Format | YAML (canonical) + JSON (download) |
| Generator | NestJS Swagger (later phase) |
| Documentation UI | Swagger UI at `/api/docs` |
| Schemas | Auto-generated from DTOs + custom mappings |
| Source | This API Design documentation |

---

## 3. OpenAPI Document Structure

### 3.1 Top-Level Fields

```yaml
openapi: 3.1.0
info:
  title: SmartLight API
  version: 1.0.0
  description: Single Vendor E-Commerce API
  contact:
    name: SmartLight Team
    email: api@smartlight.vn
    url: https://docs.smartlight.vn
  license:
    name: Proprietary
  termsOfService: https://smartlight.vn/terms
servers:
  - url: https://api.smartlight.vn/v1
    description: Production
  - url: https://api.staging.smartlight.vn/v1
    description: Staging
  - url: http://localhost:3000/v1
    description: Local development
tags:
  - name: Authentication
    description: Login, register, token management
  - name: Catalog
    description: Products, categories, brands
  ...
paths: {}
components:
  securitySchemes: {}
  schemas: {}
  parameters: {}
  responses: {}
security: []
```

---

## 4. Per-Endpoint Mapping

Every endpoint defined in this API design must have:

### 4.1 Operation ID

| EP-ID | Operation ID Convention |
| --- | --- |
| `EP-AUTH-001` | `auth.register` |
| `EP-CAT-021` | `catalog.products.list` |
| `EP-ORD-006` | `orders.cancel` |
| `EP-ADM-PAY-001` | `admin.payments.list` |

**Convention:** `{tag}.{resource}.{action}`

### 4.2 Tags

Tags group endpoints in Swagger UI. Mapping:

| Module | Tag |
| --- | --- |
| Health | `Health` |
| Authentication | `Authentication` |
| User Profile | `Users` |
| Addresses | `Addresses` |
| Catalog (public) | `Catalog` |
| Catalog (admin) | `Admin / Catalog` |
| Cart | `Cart` |
| Checkout | `Checkout` |
| Orders (customer) | `Orders` |
| Orders (admin) | `Admin / Orders` |
| Payments | `Payments` |
| Refunds | `Refunds` |
| Shipping (public) | `Shipping` |
| Shipping (admin) | `Admin / Shipping` |
| Promotions (public) | `Promotions` |
| Promotions (admin) | `Admin / Promotions` |
| Reviews | `Reviews` |
| Returns | `Returns` |
| Notifications | `Notifications` |
| Media | `Media` |
| Support | `Support` |
| Admin (general) | `Admin` |
| Audit | `Admin / Audit` |
| Feature Flags | `Admin / Feature Flags` |
| Webhooks | `Webhooks` |

### 4.3 Summary / Description

| Field | Source |
| --- | --- |
| `summary` | From "Purpose" section in module docs |
| `description` | From "Purpose" + additional context |

### 4.4 Security Requirements

| Endpoint Auth | OpenAPI Security |
| --- | --- |
| Public | `security: []` |
| Bearer | `- bearerAuth: []` |
| Webhook signature | `- signatureAuth: []` |

---

## 5. Component Schemas

### 5.1 Common Schemas

```yaml
components:
  schemas:
    ErrorResponse:
      type: object
      properties:
        error:
          $ref: '#/components/schemas/Error'
    
    Error:
      type: object
      required: [code, message, traceId, timestamp, path]
      properties:
        code:
          type: string
          example: VALIDATION_ERROR
        message:
          type: string
        details:
          type: array
          items:
            $ref: '#/components/schemas/ErrorDetail'
        traceId:
          type: string
          format: uuid
        timestamp:
          type: string
          format: date-time
        path:
          type: string
    
    ErrorDetail:
      type: object
      properties:
        field:
          type: string
        code:
          type: string
        message:
          type: string
        expectedFormat:
          type: string
        requirements:
          type: array
          items: { type: string }
    
    Pagination:
      type: object
      properties:
        page: { type: integer }
        limit: { type: integer }
        totalItems: { type: integer }
        totalPages: { type: integer }
        hasNext: { type: boolean }
        hasPrev: { type: boolean }
        nextPage: { type: integer }
        prevPage: { type: integer }
    
    CursorPagination:
      type: object
      properties:
        limit: { type: integer }
        hasNext: { type: boolean }
        nextCursor: { type: string }
        prevCursor: { type: string }
    
    Meta:
      type: object
      properties:
        pagination:
          oneOf:
            - $ref: '#/components/schemas/Pagination'
            - $ref: '#/components/schemas/CursorPagination'
        sort:
          type: array
          items: { type: object }
        filters:
          type: object
```

### 5.2 Entity Schemas

Each entity in `docs/03-database-design/ENTITY_CATALOG.md` has a corresponding schema:

```yaml
User:
  type: object
  properties:
    id: { type: string, format: uuid }
    email: { type: string, format: email }
    firstName: { type: string }
    lastName: { type: string }
    phone: { type: string }
    status:
      type: string
      enum: [pending, active, suspended]
    emailVerifiedAt: { type: string, format: date-time, nullable: true }
    locale: { type: string, default: 'vi-VN' }
    createdAt: { type: string, format: date-time }
    updatedAt: { type: string, format: date-time }
    deletedAt: { type: string, format: date-time, nullable: true }

Product:
  type: object
  properties:
    id: { type: string, format: uuid }
    name: { type: string }
    slug: { type: string }
    status:
      type: string
      enum: [draft, published, unpublished, archived]
    brand: { $ref: '#/components/schemas/Brand' }
    category: { $ref: '#/components/schemas/Category' }
    basePrice: { type: integer, description: "Price in xu" }
    currency: { type: string, default: 'VND' }
    hasVariants: { type: boolean }
    primaryImage: { $ref: '#/components/schemas/MediaFile' }
    variants:
      type: array
      items: { $ref: '#/components/schemas/ProductVariant' }
    averageRating: { type: number, format: float }
    reviewCount: { type: integer }
    createdAt: { type: string, format: date-time }
    updatedAt: { type: string, format: date-time }
```

### 5.3 Money Convention

All money fields documented as integer (xu):

```yaml
Money:
  type: object
  properties:
    amount:
      type: integer
      description: Amount in xu (1 VND = 100 xu)
      example: 20000000
    currency:
      type: string
      example: VND
```

### 5.4 DateTime Convention

```yaml
# All timestamps use ISO 8601 UTC
createdAt:
  type: string
  format: date-time
  example: "2026-07-03T15:30:00Z"
```

### 5.5 ID Convention

```yaml
# IDs always UUID v7 strings
id:
  type: string
  format: uuid
  example: "0192ca3e-c5d8-7e1f-a012-3456789abcde"
```

---

## 6. Reusable Parameters

```yaml
components:
  parameters:
    PageParam:
      name: page
      in: query
      schema:
        type: integer
        minimum: 1
        default: 1
    LimitParam:
      name: limit
      in: query
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20
    SortParam:
      name: sort
      in: query
      schema:
        type: string
        example: '-createdAt'
    CursorParam:
      name: cursor
      in: query
      schema:
        type: string
    IdempotencyKeyHeader:
      name: Idempotency-Key
      in: header
      required: true
      schema:
        type: string
        format: uuid
    AcceptLanguageHeader:
      name: Accept-Language
      in: header
      schema:
        type: string
        default: 'vi-VN'
    XRequestIdHeader:
      name: X-Request-ID
      in: header
      schema:
        type: string
        format: uuid
```

---

## 7. Reusable Responses

```yaml
components:
  responses:
    BadRequest:
      description: Bad Request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    Forbidden:
      description: Forbidden
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    NotFound:
      description: Not Found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    Conflict:
      description: Conflict
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    ValidationError:
      description: Validation Error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    RateLimited:
      description: Too Many Requests
      headers:
        Retry-After:
          schema: { type: integer }
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    InternalError:
      description: Internal Server Error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
```

---

## 8. Security Schemes

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT access token
    
    refreshTokenAuth:
      type: apiKey
      in: cookie
      name: refreshToken
      description: HTTP-only cookie for refresh tokens
    
    signatureAuth:
      type: apiKey
      in: header
      name: X-Signature
      description: Webhook signature (provider-specific)
    
    adminMfaToken:
      type: http
      scheme: bearer
      description: Short-lived MFA challenge token
```

---

## 9. Sample Operation Mapping

### 9.1 Example: `POST /v1/orders/{orderId}/cancel`

```yaml
/cancel:
  post:
    operationId: orders.cancel
    tags: [Orders]
    summary: Cancel an order (customer)
    description: |
      Cancels a pending or confirmed order. Triggers automatic refund and stock release.
      BR-ORD-007: Can cancel only if status in (pending, confirmed)
    parameters:
      - $ref: '#/components/parameters/OrderIdPath'
    headers:
      Idempotency-Key:
        $ref: '#/components/parameters/IdempotencyKeyHeader'
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [reason, confirm]
            properties:
              reason:
                type: string
                enum: [changed_mind, duplicate_order, found_better_price, delivery_too_long, payment_issue, other]
              notes:
                type: string
                maxLength: 500
              confirm:
                type: boolean
                description: Must be true to confirm cancellation
    responses:
      '200':
        description: Order cancelled
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  type: object
                  properties:
                    orderId: { type: string, format: uuid }
                    orderNumber: { type: string }
                    status: { type: string, example: cancelled }
                    cancelledAt: { type: string, format: date-time }
                    refund:
                      type: object
                      properties:
                        status: { type: string }
                        amount: { type: integer }
                        currency: { type: string }
                    stockReleased: { type: boolean }
      '400': { $ref: '#/components/responses/BadRequest' }
      '401': { $ref: '#/components/responses/Unauthorized' }
      '403': { $ref: '#/components/responses/Forbidden' }
      '404': { $ref: '#/components/responses/NotFound' }
      '409': { $ref: '#/components/responses/Conflict' }
      '422': { $ref: '#/components/responses/ValidationError' }
      '429': { $ref: '#/components/responses/RateLimited' }
      '500': { $ref: '#/components/responses/InternalError' }
    x-idempotency: required
    x-audit: order.cancelled
    x-related-use-case: UC-ORD-006
    x-related-entity: order
```

### 9.2 Custom Extensions

Use `x-` extensions for metadata not in OpenAPI standard:

| Extension | Purpose |
| --- | --- |
| `x-idempotency` | `required` / `optional` / `none` |
| `x-audit` | Audit code |
| `x-related-use-case` | UC ID |
| `x-related-entity` | Entity name |
| `x-rate-limit` | Rate limit tier |
| `x-cache` | Cache control hint |

---

## 10. Generation Workflow

### 10.1 Manual Mapping (This Phase)

Each endpoint documented with:

| Required | Element |
| --- | --- |
| ✓ | Endpoint ID |
| ✓ | Method, URL |
| ✓ | Auth, Authz |
| ✓ | Request/response shape |
| ✓ | Status codes |
| ✓ | Errors |
| ✓ | Tags (from mapping) |
| ✓ | Operation ID (auto-generated) |

### 10.2 Future: Auto-Generation

When NestJS implementation begins:
- Decorators on controllers generate OpenAPI.
- This API Design document serves as authoritative source.
- OpenAPI validation tools (e.g., Spectral) ensure compliance.

---

## 11. Coverage Validation

| Check | Status |
| --- | --- |
| OpenAPI version selected | ✓ (3.1.0) |
| Document structure planned | ✓ |
| Endpoint metadata mapping complete | ✓ |
| Tags mapping complete | ✓ |
| Common schemas defined | ✓ |
| Reusable parameters defined | ✓ |
| Reusable responses defined | ✓ |
| Security schemes defined | ✓ |
| Sample operation documented | ✓ |
| Custom extensions for metadata | ✓ |
| Generation workflow described | ✓ |

---

## 12. Endpoint Inventory by Tag

| Tag | Endpoint Count |
| --- | --- |
| Health | 3 |
| Authentication | 21 |
| Users | 10 |
| Addresses | 7 |
| Catalog | 18 |
| Admin / Catalog | 14 |
| Cart | 11 |
| Checkout | 13 |
| Orders | 8 |
| Admin / Orders | 12 |
| Payments | 8 |
| Refunds | 4 |
| Admin / Payments | 6 |
| Shipping | 4 |
| Admin / Shipping | 14 |
| Promotions | 3 |
| Admin / Promotions | 13 |
| Reviews | 5 |
| Admin / Reviews | 7 |
| Returns | 6 |
| Admin / Returns | 7 |
| Notifications | 4 |
| Admin / Notifications | 8 |
| Media | 6 |
| Support | 6 |
| Admin / Support | 6 |
| Admin / Dashboard | 4 |
| Admin / RBAC | 9 |
| Admin / Admin Users | 7 |
| Admin / Audit | 3 |
| Admin / Feature Flags | 7 |
| Admin / Config | 6 |
| Webhooks | 7 |

---

## 13. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial OpenAPI prep: structure, schemas, params, security, sample, custom extensions |

---

**End of Document — OPENAPI_PREPARATION.md**