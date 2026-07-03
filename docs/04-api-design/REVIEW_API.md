# REVIEW_API.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal API Architect

---

## 1. Purpose

This document details the **Review API endpoints** for SmartLight. Covers public review browsing, customer review submission (verified purchase only), helpful voting, and admin moderation.

---

## 2. Review Concepts

| Concept | Description |
| --- | --- |
| **Verified Purchase** | Review can be submitted only if customer purchased the variant |
| **Moderation** | All reviews go through moderation queue before publishing |
| **Helpful Voting** | Customers mark reviews as helpful |

---

## 3. Public Review Endpoints

### 3.1 EP-RVW-001 — Product Reviews

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/catalog/products/{productId}/reviews` |
| **Authentication** | None |
| **Cache** | public, max-age=120 |

**Query Parameters:**

| Name | Description |
| --- | --- |
| `rating` | Filter (1-5) |
| `withPhotos` | Boolean |
| `sort` | `-helpfulVotes`, `-createdAt`, `ratingDesc` |
| `page`, `limit` | Pagination |

**Response `200 OK`:**

```
{
  "data": [
    {
      "id": "uuid",
      "rating": 5,
      "title": "Tuyệt vời",
      "content": "Đèn sáng rất tốt, tiết kiệm điện...",
      "customer": {
        "id": "uuid",
        "displayName": "Nguyễn Văn A",
        "verified": true
      },
      "isVerifiedPurchase": true,
      "helpfulVotes": 23,
      "adminReply": {
        "content": "Cảm ơn quý khách...",
        "adminName": "Phòng CSKH",
        "createdAt": "..."
      },
      "createdAt": "2026-07-01T10:00:00Z",
      "images": [
        { "id": "uuid", "url": "https://cdn.smartlight.vn/..." }
      ]
    }
  ],
  "meta": {
    "pagination": { ... },
    "summary": {
      "averageRating": 4.5,
      "totalReviews": 23,
      "ratingDistribution": {
        "5": 15,
        "4": 5,
        "3": 2,
        "2": 1,
        "1": 0
      }
    }
  }
}
```

---

### 3.2 EP-RVW-002 — Get Single Review

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/reviews/{reviewId}` |

**Response `200 OK`:** Single review.

---

### 3.3 EP-RVW-003 — Recent Reviews

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/reviews/recent` |
| **Cache** | public, max-age=300 |

**Query Parameters:** `limit` (default 10, max 50).

---

### 3.4 EP-RVW-004 — Top-Rated Products

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/reviews/top-rated` |
| **Cache** | public, max-age=600 |

**Query:** `limit`, `categoryId`, `period` (`week` | `month` | `all`).

---

## 4. Customer Review Endpoints

### 4.1 EP-RVW-011 — Create Review

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/reviews` |
| **Authentication** | Yes |
| **Idempotency** | Required |
| **Audit** | `review.submitted` |
| **Related Use Case** | UC-RVW-001 |

**Request Body:**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `orderItemId` | string | Yes | Must be purchased by user; not yet reviewed |
| `rating` | int | Yes | 1..5 |
| `title` | string | No | Max 200 |
| `content` | string | Yes | Min 20, max 1000 chars |
| `imageMediaIds` | array | No | Uploaded via /v1/media |

**Response `201 Created`:** Review with `status: 'pending'`.

**Business Rules:**
- BR-RVW-001: Verified purchase required (BR-RVW-002)
- BR-RVW-003: One review per order item
- BR-RVW-005: Pending moderation

**Errors:**
- `ORDER_ITEM_NOT_FOUND` (404)
- `ORDER_ITEM_NOT_OWNED` (403)
- `REVIEW_ALREADY_EXISTS` (409)
- `RATING_INVALID` (422)
- `CONTENT_TOO_SHORT` / `CONTENT_TOO_LONG` (422)

---

### 4.2 EP-RVW-012 — Update Own Review

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/reviews/{reviewId}` |
| **Authentication** | Yes (own review only) |
| **Idempotency** | Required |

**Request Body (subset of create):**

| Field | Type | Notes |
| --- | --- | --- |
| `rating` | int | Optional |
| `title` | string | Optional |
| `content` | string | Optional |
| `imageMediaIds` | array | Optional; replaces |

**Response `200 OK`:** Updated review (status reset to `pending` if content changed).

---

### 4.3 EP-RVW-013 — Delete Own Review

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/reviews/{reviewId}` |
| **Audit** | `review.deleted` |

**Response:** `204 No Content`

---

### 4.4 EP-RVW-014 — Mark Review Helpful

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/reviews/{reviewId}/vote` |
| **Authentication** | Yes |

**Response `200 OK`:** `{ "data": { "voted": true, "helpfulVotes": 24 } }`

**Errors:** `CANNOT_VOTE_OWN_REVIEW` (403)

---

### 4.5 EP-RVW-015 — Remove Helpful Vote

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/reviews/{reviewId}/vote` |

**Response `200 OK`:** `{ "data": { "voted": false } }`

---

## 5. Admin Review Endpoints

### 5.1 EP-ADM-RVW-001 — List All Reviews

| Field | Value |
| --- | --- |
| **Method** | GET |
| **URL** | `/v1/admin/reviews` |
| **Authentication** | Yes (MarketingManager+) |

**Query Parameters:** `status`, `productId`, `rating`, `from`, `to`, `search`.

---

### 5.2 EP-ADM-RVW-002 — Approve Review

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/reviews/{reviewId}/approve` |
| **Audit** | `review.moderated_approved` |

**Side Effect:** Status = `published`; product rating recomputed.

---

### 5.3 EP-ADM-RVW-003 — Reject Review

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/reviews/{reviewId}/reject` |
| **Audit** | `review.moderated_rejected` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `reason` | string | Yes |

---

### 5.4 EP-ADM-RVW-004 — Hard Delete Review (PDPD)

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/admin/reviews/{reviewId}` |
| **Audit** | `review.hard_deleted` |
| **Authorization** | SuperAdmin |

---

### 5.5 EP-ADM-RVW-005 — Add Admin Reply

| Field | Value |
| --- | --- |
| **Method** | POST |
| **URL** | `/v1/admin/reviews/{reviewId}/reply` |
| **Audit** | `review_reply.added` |

**Request Body:**

| Field | Type | Required |
| --- | --- | --- |
| `content` | string | Yes (max 1000) |

**Response `201 Created`:** ReviewReply.

**Constraint:** One reply per review.

---

### 5.6 EP-ADM-RVW-006 — Update Admin Reply

| Field | Value |
| --- | --- |
| **Method** | PATCH |
| **URL** | `/v1/admin/reviews/{reviewId}/reply` |
| **Audit** | `review_reply.updated` |

---

### 5.7 EP-ADM-RVW-007 — Remove Admin Reply

| Field | Value |
| --- | --- |
| **Method** | DELETE |
| **URL** | `/v1/admin/reviews/{reviewId}/reply` |
| **Audit** | `review_reply.deleted` |

---

## 6. Cross-References

| Field | Reference |
| --- | --- |
| Use Cases | UC-RVW-001..005 |
| Business Rules | BR-RVW-001..005 |
| Workflows | WF-RVW-01..05 |
| Features | SF-RVW-001..005 |
| Entities | review, review_reply, review_helpful_vote |

---

## 7. Coverage Validation

| Check | Status |
| --- | --- |
| Public review browsing covered | ✓ |
| Verified purchase submission covered | ✓ |
| Helpful voting covered | ✓ |
| Edit/delete own review covered | ✓ |
| Admin moderation covered | ✓ |
| Admin reply covered | ✓ |
| PDPD hard delete covered | ✓ |
| Audit logging specified | ✓ |

---

## 8. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal API Architect | Initial review API: 14 endpoints (4 public + 5 customer + 7 admin) |

---

**End of Document — REVIEW_API.md**