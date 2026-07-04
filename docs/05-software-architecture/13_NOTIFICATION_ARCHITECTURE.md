# 13 — Notification Architecture

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-04
**Author:** Chief Software Architect

---

## 1. Purpose

This document defines the **notification architecture** for SmartLight: channels (email, push, SMS, in-app), templates, event-driven delivery, preferences, and providers.

---

## 2. Notification Principles

1. **Event-driven** — notifications are side-effects of domain events.
2. **Async** — never block the user request.
3. **Idempotent** — same event can be processed twice; no duplicate send.
4. **Preference-aware** — users control channels.
5. **Template-driven** — content separated from code.
6. **Locales** — Vietnamese first; English secondary.
7. **Audited** — every send (and failure) recorded.

---

## 3. Channels

| Channel | V1 Status | V1.5+ | Future |
|---|---|---|---|
| **Email** | ✓ Resend / SMTP | ✓ | ✓ |
| **In-App (Web Push)** | ✗ | ✓ | ✓ |
| **SMS** | ✗ | ✗ | ✓ (eSMS, MobiFone) |
| **Mobile Push** | ✗ | ✗ | ✓ (FCM/APNs V2) |
| **On-Site Banner** | ✓ | ✓ | ✓ |

In V1, **email** is the primary channel.

---

## 4. Notification Lifecycle

```
Domain Event (e.g., order.placed)
        ↓
  Event Handler (Notification module)
        ↓
  Resolve Recipients + Preferences
        ↓
  Render Template (locale-aware)
        ↓
  Enqueue to BullMQ
        ↓
  Worker → Provider
        ↓
  Log Result (notification_log)
        ↓
  (Optional) Webhook → Delivery tracking
```

---

## 5. Notification Module

### 5.1 Aggregate

```
class NotificationRequest {
  readonly id: UUID;
  readonly channel: 'email' | 'push' | 'sms' | 'in_app';
  readonly templateCode: string;       // e.g., 'order.confirmed'
  readonly recipientType: 'user' | 'admin' | 'vendor';
  readonly recipientId: UUID;
  readonly payload: object;            // template variables
  readonly locale: string;             // 'vi', 'en'
  readonly status: 'pending' | 'processing' | 'sent' | 'failed' | 'bounced';
  readonly attempts: number;
  readonly providerCode: string;
  readonly providerMessageId: string?;
  readonly scheduledAt?: Date;          // for delayed sends
  readonly sentAt?: Date;
  readonly failureReason?: string;
}
```

### 5.2 Public Service

```
class NotificationService {
  send(input: SendNotificationInput, actor): Promise<NotificationRequest>;
  getPreferences(userId): Promise<UserPreferences>;
  updatePreferences(userId, prefs): Promise<UserPreferences>;
}
```

---

## 6. Templates

### 6.1 Email Templates

Stored in `email_template` table:

| Column | Description |
|---|---|
| `id` | UUID |
| `code` | Unique (e.g., `order.confirmed`) |
| `subject` | Email subject (with i18n) |
| `bodyHtml` | HTML body (with Handlebars-style variables) |
| `bodyText` | Plain text body |
| `locale` | vi / en |
| `version` | Increment on edit |
| `isActive` | Boolean |
| `updatedBy`, `updatedAt` | |

### 6.2 Variable Substitution

```
{{user.firstName}}
{{order.orderNumber}}
{{order.total}}
{{order.trackingUrl}}
{{company.name}}
{{company.supportPhone}}
{{company.address}}
```

### 6.3 Locale Resolution

Per recipient:
1. User preference (if set)
2. Account default
3. Fall back to `vi`

### 6.4 Template Editing

- Admins edit via `/admin/notifications/templates`
- Versioned (don't delete prior versions; mark old as `isActive=false`)
- Preview feature available
- Test-send (to internal test account)

### 6.5 Template Library (V1)

| Code | Trigger Event | Recipient |
|---|---|---|
| `user.welcome` | user.registered | user |
| `user.email_verification` | user.registration_email_sent | user |
| `user.password_reset` | user.password_reset_requested | user |
| `user.password_changed` | user.password_changed | user |
| `order.confirmed` | order.confirmed | user |
| `order.processing` | order.processing | user |
| `order.shipped` | order.shipped | user |
| `order.out_for_delivery` | shipment.out_for_delivery | user |
| `order.delivered` | order.delivered | user |
| `order.cancelled` | order.cancelled | user |
| `order.refunded` | refund.processed | user |
| `payment.received` | payment.captured | user |
| `payment.failed` | payment.failed | user |
| `review.approved` | review.approved | user |
| `review.rejected` | review.rejected | user |
| `return.approved` | return.approved | user |
| `return.rejected` | return.rejected | user |
| `return.received` | return.item_received | user |
| `cart.abandoned` | cart.abandoned | user (delayed) |
| `inventory.low_stock_alert` | inventory.low_stock | admin |
| `admin_user.login_suspicious` | admin_user.login_suspicious | admin |
| `admin_user.mfa_setup` | admin_user.mfa_enabled | admin |
| `support_ticket.replied` | support_ticket.responded | user |
| `support_ticket.resolved` | support_ticket.resolved | user |

---

## 7. Event-Driven Notifications

### 7.1 Pattern

Notification module subscribes to domain events via BullMQ. Each subscriber:

```
@OnEvent('order.placed')
async onOrderPlaced(event: OrderPlacedEvent) {
  await this.send({
    channel: 'email',
    templateCode: 'order.confirmed',
    recipientId: event.payload.userId,
    payload: { order: event.payload }
  });
}
```

### 7.2 Subscriber List

| Event | Subscriber Handler | Template |
|---|---|---|
| `user.registered` | sendWelcomeEmail | `user.welcome` |
| `order.placed` | sendOrderConfirmation | `order.confirmed` |
| `order.shipped` | sendShippedEmail | `order.shipped` |
| `order.delivered` | sendDeliveredEmail | `order.delivered` |
| `payment.failed` | sendPaymentFailed | `payment.failed` |
| `payment.captured` | sendPaymentReceipt | `payment.received` |
| `inventory.low_stock` | sendLowStockAlert | `inventory.low_stock_alert` |
| `admin_user.login_failed` (5+) | sendSecurityAlert | `admin_user.login_suspicious` |
| `support_ticket.responded` | sendCustomerResponse | `support_ticket.replied` |
| ... etc. |

### 7.3 Idempotency

Each subscription uses `eventId` as dedup key. If duplicate arrives (BullMQ at-least-once), the notification_log can short-circuit:

```
UNIQUE INDEX (event_id, template_code)
```

---

## 8. Email Provider

### 8.1 V1 Choice

**Resend** (simple API, generous free tier; built for transactional).

### 8.2 Adapter Pattern

```
interface EmailProviderPort {
  send(input: SendEmailInput): Promise<EmailResult>;
}

class ResendEmailAdapter implements EmailProviderPort { /* Resend SDK */ }
class SmtpEmailAdapter implements EmailProviderPort { /* nodemailer */ }
```

### 8.3 Configuration

```
EMAIL_PROVIDER=resend
EMAIL_FROM="SmartLight <hello@smartlight.vn>"
EMAIL_FROM_NAME="SmartLight"
EMAIL_REPLY_TO=support@smartlight.vn
EMAIL_API_KEY=<env>
```

### 8.4 Deliverability

- SPF, DKIM, DMARC configured on `smartlight.vn`
- Dedicated IP (V2)
- Bounce handling (auto-unsubscribe hard bounces)
- Complaint handling (auto-unsubscribe)

---

## 9. In-App Notifications (V1.5+)

### 9.1 Delivery

- WebSocket connection (per logged-in user)
- Server pushes notification on event
- Stored in `notification_inbox_item`

### 9.2 Read State

```
notification_inbox_item:
  - user_id
  - type
  - payload
  - read_at (nullable)
  - created_at
```

API:
- `GET /v1/users/me/notifications` — list
- `POST /v1/users/me/notifications/{id}/read` — mark read
- `POST /v1/users/me/notifications/read-all` — mark all read

---

## 10. Push Notifications (V1.5+)

### 10.1 Web Push

- VAPID keys
- Service worker in storefront
- Subscription per browser

### 10.2 Mobile Push (V2)

- FCM (Android)
- APNs (iOS)
- Per-device subscription

---

## 11. SMS (Future V2)

For high-value events (OTP, payments) only. Providers:

- ESMS (Vietnam)
- MobiFone API
- Viettel SMS API

---

## 12. User Notification Preferences

### 12.1 Default Preferences

| Event Class | Email | Push | SMS |
|---|---|---|---|
| Order updates | ✓ | ✓ (V1.5) | ✗ |
| Payment | ✓ | ✗ | ✗ (V2 OTP) |
| Promotions | opt-in | opt-in | ✗ |
| Newsletter | opt-in | opt-in | ✗ |
| Security | ✓ (forced) | ✓ | ✓ (V2 OTP) |
| Reviews | ✓ | ✗ | ✗ |
| Cart reminders | opt-in | opt-in | ✗ |

### 12.2 User Control

API: `PATCH /v1/users/me/notification-preferences`

Categories (immutable per user):
- `order_updates` (default: all on)
- `payment_alerts` (forced on for security)
- `promotions` (default: email opt-in)
- `newsletter` (default: opt-out)
- `security` (forced on)

---

## 13. Cookie / Consent Management

PDPD compliance requires explicit consent for non-essential tracking. See `NOTIFICATION_API.md` for cookie consent API. Stored in `cookie_consent` table.

Types:
- `essential` (always on)
- `functional`
- `analytics`
- `marketing`

---

## 14. Email Best Practices

### 14.1 HTML

- Inline CSS (most clients strip `<style>`)
- Tables for layout (Outlook compatibility)
- Max 600px width
- Alt text on all images
- Web-safe fonts

### 14.2 Avoid Spam Filters

- HTML + text alt
- Reasonable image: text ratio
- Unsubscribe link in all marketing
- DKIM/SPF/DMARC
- No URL shorteners
- Avoid trigger words in subject

### 14.3 Personalization

- First name
- Relevant content (order-specific)
- Locale-aware

### 14.4 Preheader

Each email includes a preheader for inbox preview.

---

## 15. Async Processing (Queue)

All notification sends go through `notification.send` BullMQ queue. See `15_BACKGROUND_JOB_ARCHITECTURE.md`.

```
queue('notification.email', {
  attempts: 5,
  backoff: { type: 'exponential', delay: 30000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: false
});
```

---

## 16. Failure Handling

| Failure | Action |
|---|---|
| Provider timeout | Retry with backoff |
| Provider rate limit | Retry after 5min |
| Hard bounce | Mark email invalid; future emails dropped |
| Soft bounce | Retry next hour |
| Complaint | Mark unsubscribed |
| Unknown | DLQ after 5 attempts |

---

## 17. Audit & Observability

Each notification write to `notification_log`:

```
columns:
  - id (UUID)
  - user_id (nullable)
  - email (recipient email at time of send)
  - template_code
  - locale
  - channel
  - status
  - attempts
  - provider_message_id (nullable)
  - provider_response (JSONB, nullable)
  - failure_reason (nullable)
  - sent_at (nullable)
  - created_at
  - updated_at
```

Dashboard at `/admin/notifications/logs`.

---

## 18. Coverage Validation

| Check | Status |
|---|---|
| Channels defined with V1/V1.5/V2 status | ✓ |
| Notification lifecycle | ✓ |
| Email templates structure | ✓ |
| Locale resolution | ✓ |
| Event-driven pattern | ✓ |
| Subscriber list | ✓ |
| Email provider adapter | ✓ |
| In-app notifications | ✓ |
| Push notifications | ✓ |
| SMS future | ✓ |
| User preferences | ✓ |
| Cookie consent | ✓ |
| Audit log | ✓ |
| Failure handling | ✓ |

---

## 19. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Chief Software Architect | Initial notification architecture: email-first + future channels |

---

**End of 13_NOTIFICATION_ARCHITECTURE.md**