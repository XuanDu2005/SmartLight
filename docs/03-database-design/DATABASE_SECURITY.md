# DATABASE_SECURITY.md — SmartLight

**Project:** SmartLight — Single Vendor E-Commerce Platform
**Document Version:** 1.0
**Status:** Draft
**Date:** 2026-07-03
**Author:** Principal Database Architect

---

## 1. Purpose

This document defines **database security** for SmartLight:
- Sensitive data classification
- Encryption requirements
- Hashing algorithms
- PII handling
- Access policy
- Audit policy
- Token storage
- Secrets management

This is **design only** — no SQL is generated.

---

## 2. Defense in Depth

Security is implemented in multiple layers:

```
Layer 1: Application (auth, validation, authorization)
Layer 2: ORM (Prisma query construction, parameterized queries)
Layer 3: Database roles (least privilege)
Layer 4: Database encryption (TDE, column-level)
Layer 5: Network (TLS, VPC, IP allowlist)
Layer 6: Backup encryption
Layer 7: Audit logging
```

---

## 3. Data Sensitivity Classification

| Class | Examples | Storage |
| --- | --- | --- |
| PUBLIC | Product names, prices, descriptions | Plain |
| INTERNAL | Audit logs (most), system configs | Plain |
| CONFIDENTIAL | Customer email, name, phone, address | Plain with row-level protection |
| RESTRICTED | Password hashes, MFA secrets, TOTP secrets | Encrypted at column level |

---

## 4. Sensitive Data Inventory

### 4.1 PII (Personally Identifiable Information)

| Field | Table | Class | Notes |
| --- | --- | --- | --- |
| Email | user, admin_user | CONFIDENTIAL | Login identifier |
| Password Hash | user, admin_user | RESTRICTED | Argon2id |
| First Name | user | CONFIDENTIAL | Vietnamese diacritics |
| Last Name | user | CONFIDENTIAL | Vietnamese diacritics |
| Phone | user, address, order_address, return | CONFIDENTIAL | Vietnamese format |
| Address | address, order_address | CONFIDENTIAL | Full delivery details |
| Email | guest orders | CONFIDENTIAL | For guest checkout |
| MFA Secret | mfa_secret | RESTRICTED | TOTP secret (AES-256-GCM) |
| Recovery Code Hash | recovery_code | RESTRICTED | One-time use |
| Refresh Token Hash | refresh_token | CONFIDENTIAL | SHA-256 |
| IP Address | audit_log, user_session | CONFIDENTIAL | Logged for security |
| User Agent | audit_log, user_session | INTERNAL | Logged |

### 4.2 Financial Data (PCI Scope Minimization)

| Field | Table | Class | Notes |
| --- | --- | --- | --- |
| Payment intent ID | payment | CONFIDENTIAL | Provider's ID, no card data |
| Provider Transaction ID | payment_transaction | CONFIDENTIAL | Provider's ID |
| Provider Refund ID | refund | CONFIDENTIAL | Provider's ID |
| **Card Data** | (none) | N/A | **NOT STORED** — tokenization via provider |

> **PCI Compliance:** SmartLight never stores, processes, or transmits card numbers, CVV, or expiration dates. All card handling is via VNPay/MoMo/ZaloPay hosted pages. (BR-PAY-001)

### 4.3 Authentication Material

| Material | Storage | Algorithm |
| --- | --- | --- |
| Password | Argon2id hash | Argon2id with secure parameters |
| MFA TOTP secret | AES-256-GCM encrypted | Symmetric encryption |
| MFA recovery codes | SHA-256 hash | One-way hash |
| Refresh tokens | SHA-256 hash of token | One-way hash |
| Session ID | SHA-256 hash | One-way hash |
| Webhook signatures | Verified via HMAC-SHA256; signature not stored | — |

---

## 5. Encryption Strategy

### 5.1 Encryption at Rest

| Component | Encryption |
| --- | --- |
| PostgreSQL data files | AES-256 (Neon-managed) |
| Backups | AES-256 (Neon-managed) |
| Object storage (Cloudinary media) | TLS in transit; provider-managed at rest |
| Redis (caching, sessions) | TLS in transit; AES-256 at rest |
| Environment variables | Encrypted by hosting platform |

### 5.2 Encryption in Transit

| Connection | Protocol |
| --- | --- |
| App → PostgreSQL | TLS 1.2+ required |
| App → Redis | TLS 1.2+ required |
| App → Cloudinary | HTTPS required |
| App → Payment provider | HTTPS required (TLS 1.2+) |
| Browser → Vercel | HTTPS + HSTS |

### 5.3 Column-Level Encryption (Application-Managed)

For data classified as **RESTRICTED**, column-level encryption is applied via application code:

| Column | Encryption Method |
| --- | --- |
| `mfa_secret.secret_encrypted` | AES-256-GCM (with key from KMS) |
| `admin_user.password_hash` | Argon2id (one-way) |
| `user.password_hash` | Argon2id (one-way) |

### 5.4 Key Management

| Key Type | Storage | Rotation |
| --- | --- | --- |
| Database encryption | Neon-managed | Per Neon policy |
| Application secret encryption | Environment variables / KMS | Annually or on incident |
| MFA secret encryption | Per-app key in environment | Annually |
| Webhook signing secret | Per provider | Per provider policy |

> **Production:** Use AWS KMS / GCP KMS / equivalent for secret encryption keys.
> **V1 (Neon):** Use environment variables + a strong master key.

---

## 6. Hashing Algorithms

| Purpose | Algorithm | Parameters |
| --- | --- | --- |
| Password | Argon2id | memory: 64MB, iterations: 3, parallelism: 1 |
| Refresh token (storage) | SHA-256 | Standard |
| Session ID (storage) | SHA-256 | Standard |
| MFA recovery code (storage) | SHA-256 | Standard |
| Webhook signature | HMAC-SHA256 | Standard |
| Audit chain hash (V2) | SHA-256 with chaining | Per-row prev hash |

### 6.1 Why Argon2id for Passwords?

- Memory-hard (resists GPU attacks)
- Recommended by OWASP 2024
- Side-channel resistant
- Industry standard for new applications

### 6.2 Why SHA-256 for Tokens?

- Fast verification (every request)
- Tokens have high entropy (256-bit)
- Not the primary security; main security is short TTL

---

## 7. Access Policy

### 7.1 Database Roles (PostgreSQL)

| Role | Purpose | Permissions |
| --- | --- | --- |
| `app_user` | Application runtime | SELECT, INSERT, UPDATE, DELETE on app tables |
| `app_readonly` | Reporting (BI tools) | SELECT only |
| `audit_writer` | Audit log writer | INSERT only on audit_log; SELECT |
| `migrator` | Migrations | Full DDL; runtime equivalent |
| `dba` | DBA operations | All |
| `backup_user` | Backup operations | SELECT, LOCK |

### 7.2 Least Privilege

- `app_user` has NO DDL permissions (cannot CREATE/ALTER/DROP).
- `app_user` has NO direct permission on `audit_log` UPDATE/DELETE.
- `app_readonly` has no write permissions.
- All roles have connection limits.

### 7.3 Row-Level Security (RLS) — Optional V2

For future multi-tenancy or stricter separation:
- Enable PostgreSQL RLS on customer-owned tables.
- Policies based on `current_setting('app.user_id')`.

> **V1:** RLS not required (single-tenant single-vendor). V2 (marketplace) may need RLS for seller isolation.

### 7.4 Connection Security

| Aspect | Configuration |
| --- | --- |
| SSL mode | `require` (TLS mandatory) |
| Certificate verification | `full` (verify CA) |
| Connection pooling | PgBouncer or Neon pooler |
| Max connections per role | Limited |

---

## 8. PII Handling

### 8.1 PDPD Compliance (Vietnam)

Vietnam's Personal Data Protection Decree 13/2023 requires:
- Consent for data collection
- Purpose limitation
- Data minimization
- Right to access, correction, deletion
- Data breach notification

### 8.2 Implementation

| Requirement | Implementation |
| --- | --- |
| Consent | Cookie consent banner + opt-in for marketing |
| Purpose | Documented in `cookie_consent` and `notification_preference` |
| Minimization | Only collect fields needed (e.g., no DOB unless needed) |
| Right to access | Customer account page exposes all data |
| Right to correction | Edit profile functionality |
| Right to deletion | Account deletion flow with anonymization |
| Breach notification | Security incident runbook (separate doc) |

### 8.3 Anonymization vs Deletion

Per PDPD right-to-be-forgotten:
- Anonymize (replace PII with non-identifying values)
- Preserve aggregate data
- Preserve financial records (legal requirement)
- Anonymize audit logs (actor reference only)

> See `SOFT_DELETE_STRATEGY.md` §8.3 for details.

### 8.4 Cross-Border Data

- Vietnamese data stored in Vietnam (or Singapore) region
- No transfer outside Vietnam without consent
- Cloudinary CDN: ensure region compliance

---

## 9. Audit Policy

### 9.1 Database Audit

- **Connection logging:** All connections logged.
- **DDL logging:** Schema changes logged.
- **Privileged operations:** DBA actions logged.

> Use PostgreSQL `pgaudit` extension (or Neon equivalent).

### 9.2 Application Audit

See `AUDIT_LOG_STRATEGY.md` for full details.

### 9.3 Retention

| Audit Type | Retention |
| --- | --- |
| Application audit | 7 years (financial) |
| Database audit (DBA) | 2 years |
| Connection logs | 90 days |

---

## 10. Token Storage

### 10.1 Access Tokens (JWT)

- Stateless; not stored in DB.
- Short-lived (15 min default).
- Signed with HS256 or RS256 (RS256 in production for key rotation).

### 10.2 Refresh Tokens

| Aspect | Storage |
| --- | --- |
| Format | Opaque random (256-bit) |
| Hash stored in DB | SHA-256 of token |
| TTL | 7 days (default); 30 days if "remember me" |
| Rotation | On use; old token invalidated |
| Revocation | Set `revoked_at` |
| Storage | `refresh_token` table |

### 10.3 Session IDs

- Stored in HTTP-only Secure SameSite cookies.
- Session record in `user_session` (SHA-256 hash of session ID).

### 10.4 CSRF Tokens

- Per-session random.
- Compared on state-changing requests.

### 10.5 Webhook Signature Verification

- HMAC-SHA256 of payload with shared secret.
- Verified at API layer.
- Failed signatures logged.

---

## 11. Secrets Management

### 11.1 Secret Categories

| Secret | Storage |
| --- | --- |
| Database connection string | Environment variable |
| Redis URL | Environment variable |
| Payment provider keys | Environment variable |
| Cloudinary keys | Environment variable |
| Email provider keys | Environment variable |
| MFA secret encryption key | Environment variable (rotate annually) |
| JWT signing keys | Environment variable |
| Webhook secrets | Per-provider environment variable |

### 11.2 Secret Storage Rules

| Rule | Implementation |
| --- | --- |
| Never in source code | Code review + pre-commit `gitleaks` |
| Never in logs | Log sanitization |
| Never in error messages | Sanitized error responses |
| Encrypted at rest in CI | Encrypted secrets in CI |

### 11.3 Secret Rotation

| Secret | Rotation |
| --- | --- |
| JWT signing key | Quarterly |
| Webhook secrets | On provider change |
| Database password | Annually |
| MFA secret encryption key | Annually (with re-encryption job) |
| Third-party API keys | Per provider policy |

---

## 12. SQL Injection Prevention

### 12.1 Application Layer

| Practice | Implementation |
| --- | --- |
| ORM | Prisma with parameterized queries (mandatory) |
| Raw SQL | Forbidden; if required, parameterized + review |
| Input validation | Zod schemas at API boundary |
| Output encoding | Automatic in templating engines |

### 12.2 CodeQL Scanning

- CodeQL enabled in CI (NFR-SEC-014)
- Blocks PRs with SQL injection vulnerabilities

### 12.3 Stored Procedures

- **Forbidden** in V1 to reduce injection surface.
- Business logic in application code only.

---

## 13. Backup Security

| Aspect | Configuration |
| --- | --- |
| Encryption at rest | AES-256 |
| Backup retention | 30 days |
| Backup access | Restricted to DBA role only |
| Backup verification | Daily restore test |
| Offsite storage | Different region from primary |

---

## 14. Network Security

| Aspect | Configuration |
| --- | --- |
| Database exposed to internet | **No** — only via private network |
| App ↔ DB | Same VPC; or SSL-required connection |
| Redis | Same VPC; SSL |
| Bastion access | Required for DBA |
| IP allowlist | Production DB allowlists known app IPs |

---

## 15. Privacy by Design Principles

| Principle | Implementation |
| --- | --- |
| Lawfulness, fairness, transparency | Privacy policy + cookie consent |
| Purpose limitation | Documented purpose per data field |
| Data minimization | Only necessary fields collected |
| Accuracy | Customer self-service edit |
| Storage limitation | Retention policy + soft delete + purge |
| Integrity & confidentiality | Encryption + access controls + audit |
| Accountability | DPO designation + audit trail |

---

## 16. Specific Security Concerns

### 16.1 Account Takeover

| Risk | Mitigation |
| --- | --- |
| Credential stuffing | Rate limiting (BR-ID-013); lockout after 5 failures |
| Phishing | HTTPS + HSTS; user education (out of scope) |
| Session hijacking | HTTP-only Secure cookies; IP binding (optional) |
| Token theft | Short access TTL; refresh rotation; revocation |

### 16.2 Payment Fraud

| Risk | Mitigation |
| --- | --- |
| Card testing | Rate limiting on checkout |
| Chargebacks | Provider fraud detection; manual review |
| Webhook spoofing | HMAC signature verification |
| Double-spending | Idempotency keys on payment creation |

### 16.3 Inventory Manipulation

| Risk | Mitigation |
| --- | --- |
| Stock racing | SELECT FOR UPDATE in transactions |
| Negative stock | DB CHECK constraint + application invariant |
| Unauthorized stock changes | Admin role + audit log |
| Customer-visible cache mismatch | Cache invalidation on stock mutation |

### 16.4 PII Leakage

| Risk | Mitigation |
| --- | --- |
| Logs exposing PII | Log sanitization; structured logging |
| Error messages leaking | Generic error messages in production |
| Backup exposure | Encrypted backups; restricted access |
| Audit log PII | Anonymization after retention |

### 16.5 Privilege Escalation

| Risk | Mitigation |
| --- | --- |
| Admin compromise | MFA mandatory; session timeout; audit |
| Role manipulation | Restricted to Admin role; audit |
| API authorization bypass | Guards on every endpoint |
| Direct DB access | No DB access from app server after deploy |

---

## 17. Security Testing

| Test | Frequency |
| --- | --- |
| SQL injection scan (CodeQL) | Every PR |
| Dependency scan | Every PR |
| Static analysis (lint, type check) | Every PR |
| Penetration test | Annually (V1.5+) |
| OWASP Top 10 review | Quarterly |
| PCI scope review | Quarterly |

---

## 18. Incident Response

| Incident | Action |
| --- | --- |
| Suspected breach | Page on-call; freeze writes; investigate |
| Data leak | Notify affected users (PDPD 72h requirement) |
| Webhook signature failure | Log; rate limit; alert |
| Multiple failed logins | Auto-lockout; notify user |

---

## 19. Business Rules (Security)

| ID | Rule |
| --- | --- |
| BR-SEC-001 | All passwords stored as Argon2id hash |
| BR-SEC-002 | MFA secrets encrypted at column level (AES-256-GCM) |
| BR-SEC-003 | MFA required for all admin roles (BR-MFA-001) |
| BR-SEC-004 | Account lockout after 5 failed logins |
| BR-SEC-005 | Refresh tokens hashed before storage |
| BR-SEC-006 | All DB connections use TLS |
| BR-SEC-007 | No card data stored (PCI scope minimization) |
| BR-SEC-008 | Webhook signatures verified before processing |
| BR-SEC-009 | Audit log rows append-only |
| BR-SEC-010 | PII anonymized on user deletion request |
| BR-SEC-011 | Cookie consent required for non-essential tracking |
| BR-SEC-012 | Secrets never in source code or logs |

---

## 20. Coverage Validation

| Check | Status |
| --- | --- |
| All PII classified | ✓ |
| All RESTRICTED data encrypted | ✓ |
| Password hashing specified | ✓ |
| Token storage strategy defined | ✓ |
| Database roles documented | ✓ |
| Audit strategy aligned | ✓ |
| PDPD requirements covered | ✓ |
| SQL injection prevention covered | ✓ |
| Incident response referenced | ✓ |

---

## 21. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-03 | Principal Database Architect | Initial database security: PII inventory, encryption strategy, hashing algorithms, database roles, token storage, PDPD compliance, security testing |

---

**End of Document — DATABASE_SECURITY.md**