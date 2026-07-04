# 12 — Security and Data Protection

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Approved for Backend Implementation
**Date:** 2026-07-04
**Author:** Principal Database Architect

---

## 1. Purpose

This document describes how the database layer enforces **security and data protection**:

- Encryption (at rest, in transit)
- Database role least privilege
- PII handling
- Auditing and traceability
- Backups, retention, and recovery
- Threat model (focused on data layer)
- Compliance (PDPD / PCI-DSS-lite / consumer protection)

---

## 2. Threat Model (Data Layer)

| Threat | Mitigation |
|---|---|
| DB connection interception | TLS 1.3 required (`sslmode=require`) |
| DB admin credential leak | Argon2id-hashed connections; per-user audit role |
| SQL injection | Prisma parameterized queries (no raw SQL except whitelisted migrations) |
| PII exfiltration via audit log | Audit log access gated by `super_admin` role; redaction rules in app |
| Append-only table tampering | DB role without DELETE/UPDATE on audit; Postgres trigger rejects |
| Backup theft | Encrypted backups (Neon side) + immutable retention |
| Credential stuffing on login | `failed_login_count` + lockout |
| Insider abuse | All admin actions in `audit_log`; reviewed quarterly |
| Webhook spoofing | HMAC SHA-256 signature verification before insert into `webhook_event` |
| Order fraud post-payment | Order immutability; double-cancel prevention |

---

## 3. Encryption

### 3.1 In Transit

- All DB connections **must** use TLS 1.3.
- `DATABASE_URL` requires `sslmode=require`.
- Connection pooler (Neon / PgBouncer) verified for TLS termination.
- Inside network: TLS only.

### 3.2 At Rest

- Postgres data files encrypted at rest by **Neon managed storage** (LUKS via Neon-managed encryption).
- Field-level encryption for select sensitive columns:
  - `MfaSecret.encryptedSecret` — encrypted via application (Argon2id-style envelope).
  - Backup export — encrypted with AES-256-GCM prior to download.
- Backups encrypted at rest via Neon storage layer.

### 3.3 Password Storage (Application Layer)

- Password hashing handled in app (Argon2id per `05-software-architecture/06_SECURITY_ARCHITECTURE.md`).
- DB only stores `password_hash` (text); cannot be reversed.

---

## 4. Database Roles and Least Privilege

### 4.1 Roles

| Role | Use | Permissions |
|---|---|---|
| `smartlight_app` | Application runtime | SELECT, INSERT, UPDATE on all app tables; no DROP/ALTER |
| `smartlight_app_migration` | Used by Prisma Migrate during deploy | Full DDL on app schema (creates, alters, indexes) |
| `smartlight_etl` | Analytics ETL (read-only) | SELECT on whitelisted tables only; `audit_log` masked |
| `smartlight_backup` | Backup / snapshot | Read-only |
| `smartlight_admin` | DBA access | Bypasses row-level checks |

### 4.2 Row-Level Security (RLS)

Out of scope for V1 to keep complexity low; revisitable.

### 4.3 Implementation Notes

- Roles created via raw SQL in initial migration (`00_init_roles.sql`).
- Application connects only via `smartlight_app`.
- Migrations run via `smartlight_app_migration` with elevated DDL rights.

---

## 5. PII Identification and Handling

### 5.1 PII Field Map

| Field | PII class | Notes |
|---|---|---|
| `user.email` | Direct | Login; PDPD scope |
| `user.firstName`, `user.lastName` | Direct | Display |
| `user.phone` | Direct | Verified format |
| `user.passwordHash` | Authentication credential | bcrypt/argon2 |
| `admin_user.email`, `admin_user.displayName` | Direct | Login |
| `address.*` (street, phone, name) | Direct | Shipping |
| `order_address.*` | Direct | Snapshot retained |
| `order.guestEmail`, `order.guestPhone` | Direct | Guest ordering |
| `notification_log.recipientEmail` | Direct | Delivery |
| `audit_log.beforeJson / afterJson / metadataJson` | May contain PII | Gated access |

### 5.2 Encryption & Hashing Rules

- **Direct PII** stored in cleartext (necessary for operations) but DB-encrypted at rest (Neon) + TLS in transit.
- **Sensitive authentication data** (password hash) stored with one-way hash.
- **MFA secrets**: encrypted with envelope (master key in env, per-row AES-GCM).

### 5.3 PII Access Policy

- Only authenticated admins with `super_admin` role can bulk export.
- API endpoints that expose PII are gated by `permission.customer.read` or stronger.
- Audit log entry created for every PII access (category `DATA_EXPORT`).

### 5.4 PDPD Compliance Posture

SmartLight declares its database-side PDPD alignment:

| PDPD requirement | Implementation |
|---|---|
| Consent collection | `cookie_consent`, `acceptsMarketing` |
| Right of access | `GET /v1/users/me/data-export` |
| Right to erasure | Anonymization job (§5 of `07_DATA_LIFECYCLE.md`) |
| Right of rectification | `PATCH /v1/users/me` |
| Right to data portability | JSON export |
| Right to object (processing) | `PATCH /v1/users/me/notifications` |
| Storage limitation | Soft delete + purge jobs |
| Security safeguards | TLS 1.3, encryption at rest, role separation |
| Audit | `audit_log` 7-year retention |
| Records of processing | `audit_log` + `notification_log` |

---

## 6. Audit Log Security

### 6.1 Properties

| Property | Implementation |
|---|---|
| **Append-only** | Postgres `REVOKE UPDATE, DELETE ON audit_log FROM smartlight_app` (V1.1) |
| **Tamper detection** | Hash chain (optional V1.1) — `previous_hash` column |
| **Access logging** | Every read by admin audited as `DATA_EXPORT` |
| **Retention** | 7 years |
| **PII redaction** | App-level filter before serializing into `beforeJson`/`afterJson` |
| **Data class tags** | Category enum restricts what metadata fields apply |

### 6.2 Append-Only Mechanism (Postgres)

```sql
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM smartlight_app;

CREATE OR REPLACE FUNCTION audit_log_no_modify()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_block_modify
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_no_modify();
```

---

## 7. Webhook Integrity

### 7.1 Signature Verification

- Every webhook handler MUST verify HMAC SHA-256 against the provider's secret.
- Insert into `webhook_event` only AFTER signature passes; otherwise return 401.
- Stored raw payload in `payload_json` for reprocessing.

### 7.2 Idempotency Anchor

- `WebhookEvent UNIQUE(provider, eventId)` prevents duplicate processing even if signature tampering is attempted.

---

## 8. Secrets Management

- DB credentials live in env vars (`.env`); see `docs/05-software-architecture/08_CONFIGURATION_ARCHITECTURE.md`.
- **Never** persisted to logs.
- Logger middleware redacts fields prefixed with `password`, `secret`, `token`, `cookie`.

---

## 9. Backup & Recovery

| Component | Strategy |
|---|---|
| Snapshot backups | Neon auto-snapshot (point-in-time restore, 7 days) |
| Application-side backups | Weekly export of summary tables |
| Disaster recovery target | RPO 1h; RTO 4h |
| Backup encryption | AES-256 (Neon-side) |
| Backup location | Primary region; replicated to secondary region (V1.5) |

---

## 10. Network Security

- All ingress through HTTPS (`sslmode=require`).
- VPC-isolated Postgres; only the application VPC connects.
- Whitelist IPs for admin DB access (Bastion or VPN).

---

## 11. Activity Logging & Alerting

| Event | Alert on |
|---|---|
| Failed admin logins > 5 / 10 min | Email + ticket |
| Bulk PII export (> 1000 records) | Approver workflow |
| Audit log `DATA_DELETE` outside business hours | Real-time alert |
| DB connection from new IP | Notification |
| Order refunded > X threshold | Manager notification |
| Pattern of `SQLSTATE 23xxx` (integrity violation) | Daily digest |

---

## 12. Anti-Patterns to Avoid

- **Storing** plaintext passwords (always Argon2id).
- **Sharing** the DB `postgres` superuser credentials.
- **Printing** full DB rows in logs.
- **Storing** raw card / payment data; only tokenized IDs are kept in `payment`.
- **Disabling** TLS for local debugging outside dev.

---

## 13. Security Checklist (CI / DB Migration Gate)

```yaml
- name: DB Security Checks
  run: |
    - Verify SSL: psql $DB_URL -c "SHOW ssl;"
    - Verify migration integrity: prisma migrate verify
    - Verify no DROP statements in migrations: ./scripts/forbid-drop.sh
    - Verify no "public" schema grants: ./scripts/check-grants.sh
```

---

## 14. Credential Rotation

| Item | Frequency | Procedure |
|---|---|---|
| App DB password | Quarterly | Rotation via Neon; update env + redeploy |
| Webhook provider secrets | Yearly + on rotation event | Provider-side |
| JWT signing keys | Yearly | App-side rotation |

---

## 15. Document Control

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-07-04 | Principal Database Architect | Initial security posture |

---

**End of 12_SECURITY_AND_DATA_PROTECTION.md**
