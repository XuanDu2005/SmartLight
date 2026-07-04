-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'CLOSED', 'ANONYMIZED');

-- CreateEnum
CREATE TYPE "AdminUserStatus" AS ENUM ('PENDING_MFA_SETUP', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'DISABLED');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('SYSTEM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RefreshTokenReason" AS ENUM ('REFRESH', 'LOGOUT', 'ADMIN_REVOKE', 'PASSWORD_RESET', 'SECURITY');

-- CreateEnum
CREATE TYPE "UserSessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'ADMIN_USER', 'SYSTEM', 'WEBHOOK', 'ANONYMOUS');

-- CreateEnum
CREATE TYPE "AuditActionCategory" AS ENUM ('AUTH', 'AUTHN_FAILED', 'AUTHN_SUCCESS', 'AUTHZ_DENIED', 'USER_MANAGEMENT', 'ROLE_MANAGEMENT', 'RBAC_CHANGE', 'DATA_EXPORT', 'DATA_DELETE');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" TEXT,
    "provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
    "provider_id" TEXT,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "phone" VARCHAR(20),
    "locale" VARCHAR(10) NOT NULL DEFAULT 'vi-VN',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "email_verified_at" TIMESTAMPTZ(6),
    "email_verification_token" VARCHAR(128),
    "password_changed_at" TIMESTAMPTZ(6),
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "accepts_marketing" BOOLEAN NOT NULL DEFAULT false,
    "gdpr_anonymized_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_user" (
    "id" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "status" "AdminUserStatus" NOT NULL DEFAULT 'PENDING_MFA_SETUP',
    "last_login_at" TIMESTAMPTZ(6),
    "last_login_ip" VARCHAR(45),
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "scope" "RoleScope" NOT NULL DEFAULT 'CUSTOM',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "category" VARCHAR(60) NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_user_role" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_user_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" TEXT NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "user_id" TEXT,
    "admin_user_id" TEXT,
    "session_id" TEXT,
    "reason" "RefreshTokenReason" NOT NULL DEFAULT 'REFRESH',
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "revoked_reason" VARCHAR(120),
    "replaced_by_id" TEXT,
    "user_agent" VARCHAR(255),
    "ip" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_session" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "admin_user_id" TEXT,
    "status" "UserSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "ip" VARCHAR(45) NOT NULL,
    "user_agent" VARCHAR(255) NOT NULL,
    "device_label" VARCHAR(80),
    "geo_country" VARCHAR(2),
    "geo_city" VARCHAR(80),
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "category" "AuditActionCategory" NOT NULL,
    "action" VARCHAR(120) NOT NULL,
    "entity_type" VARCHAR(60) NOT NULL,
    "entity_id" VARCHAR(64) NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "actor_user_id" TEXT,
    "actor_admin_id" TEXT,
    "request_id" VARCHAR(64),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "metadata_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_status_idx" ON "user"("status");

-- CreateIndex
CREATE INDEX "user_deleted_at_idx" ON "user"("deleted_at");

-- CreateIndex
CREATE INDEX "user_locked_until_idx" ON "user"("locked_until");

-- CreateIndex
CREATE UNIQUE INDEX "user_provider_provider_id_key" ON "user"("provider", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_email_key" ON "admin_user"("email");

-- CreateIndex
CREATE INDEX "admin_user_status_idx" ON "admin_user"("status");

-- CreateIndex
CREATE INDEX "admin_user_locked_until_idx" ON "admin_user"("locked_until");

-- CreateIndex
CREATE UNIQUE INDEX "role_code_key" ON "role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_key" ON "permission"("code");

-- CreateIndex
CREATE INDEX "permission_category_idx" ON "permission"("category");

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_role_id_permission_id_key" ON "role_permission"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "user_role_role_id_idx" ON "user_role"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_user_id_role_id_key" ON "user_role"("user_id", "role_id");

-- CreateIndex
CREATE INDEX "admin_user_role_role_id_idx" ON "admin_user_role"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_role_admin_user_id_role_id_key" ON "admin_user_role"("admin_user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_replaced_by_id_key" ON "refresh_token"("replaced_by_id");

-- CreateIndex
CREATE INDEX "refresh_token_user_id_idx" ON "refresh_token"("user_id");

-- CreateIndex
CREATE INDEX "refresh_token_admin_user_id_idx" ON "refresh_token"("admin_user_id");

-- CreateIndex
CREATE INDEX "refresh_token_expires_at_idx" ON "refresh_token"("expires_at");

-- CreateIndex
CREATE INDEX "refresh_token_revoked_at_idx" ON "refresh_token"("revoked_at");

-- CreateIndex
CREATE INDEX "user_session_user_id_idx" ON "user_session"("user_id");

-- CreateIndex
CREATE INDEX "user_session_admin_user_id_idx" ON "user_session"("admin_user_id");

-- CreateIndex
CREATE INDEX "user_session_status_idx" ON "user_session"("status");

-- CreateIndex
CREATE INDEX "user_session_expires_at_idx" ON "user_session"("expires_at");

-- CreateIndex
CREATE INDEX "audit_log_category_created_at_idx" ON "audit_log"("category", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_actor_admin_id_created_at_idx" ON "audit_log"("actor_admin_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_role" ADD CONSTRAINT "admin_user_role_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_role" ADD CONSTRAINT "admin_user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "user_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_session" ADD CONSTRAINT "user_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_session" ADD CONSTRAINT "user_session_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_admin_id_fkey" FOREIGN KEY ("actor_admin_id") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
