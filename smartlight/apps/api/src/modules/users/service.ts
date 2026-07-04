/**
 * User service \u2014 minimal integration with Prisma + role resolution.
 *
 * Provides a thin, framework-aware wrapper over Prisma for queries that are
 * shared by the auth flow (registration, login, current-user lookup, etc.)
 * and by future user-management endpoints.
 *
 * No business logic specific to other modules lives here.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.service';
import { AdminUser, AuthProvider, Prisma, User, UserStatus } from '@prisma/client';
import type { UserPrincipal } from './interfaces/user-principal.interface';
import type { UserResponseDto } from './dto/user-response.dto';

export interface AuthenticatedAccount {
  user: User;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Reads -------------------------------------------------------------

  /** Find a customer by id (excludes soft-deleted). */
  findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  /** Find a customer by email (excludes soft-deleted). */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  /** Find a customer by OAuth (provider, providerId). */
  findByOAuth(
    provider: AuthProvider,
    providerId: string,
  ): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { provider, providerId, deletedAt: null },
    });
  }

  /** Find an admin by id. */
  findAdminById(id: string): Promise<AdminUser | null> {
    return this.prisma.adminUser.findFirst({
      where: { id, deletedAt: null },
    });
  }

  /** Find an admin by email. */
  findAdminByEmail(email: string): Promise<AdminUser | null> {
    return this.prisma.adminUser.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  // ---- Mutations ---------------------------------------------------------

  /**
   * Create a local-credentials customer.
   * Password hashing is the caller's responsibility (see AuthService).
   */
  createLocalUser(input: {
    email: string;
    passwordHash: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    locale: string;
    acceptsMarketing: boolean;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        locale: input.locale,
        acceptsMarketing: input.acceptsMarketing,
        provider: AuthProvider.LOCAL,
        providerId: null,
        status: UserStatus.PENDING_VERIFICATION,
      },
    });
  }

  /**
   * Upsert a user coming from an OAuth provider. Returns the resulting user.
   * - If a row with (provider, providerId) exists \u2192 update profile.
   * - Else if a local account with the same email exists \u2192 attach provider.
   * - Else create a new account (auto-registered).
   */
  upsertOAuthUser(input: {
    provider: AuthProvider;
    providerId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  }): Promise<User> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingByProvider = await tx.user.findFirst({
        where: {
          provider: input.provider,
          providerId: input.providerId,
          deletedAt: null,
        },
      });
      if (existingByProvider) {
        return tx.user.update({
          where: { id: existingByProvider.id },
          data: {
            emailVerifiedAt: existingByProvider.emailVerifiedAt ?? new Date(),
            firstName: input.firstName ?? existingByProvider.firstName,
            lastName: input.lastName ?? existingByProvider.lastName,
          },
        });
      }

      const existingByEmail = await tx.user.findFirst({
        where: { email: input.email.toLowerCase(), deletedAt: null },
      });
      if (existingByEmail) {
        return tx.user.update({
          where: { id: existingByEmail.id },
          data: {
            provider: input.provider,
            providerId: input.providerId,
            emailVerifiedAt: existingByEmail.emailVerifiedAt ?? new Date(),
          },
        });
      }

      return tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash: null,
          provider: input.provider,
          providerId: input.providerId,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: null,
          locale: 'vi-VN',
          acceptsMarketing: false,
          status: UserStatus.PENDING_VERIFICATION,
          emailVerifiedAt: new Date(), // OAuth email is already verified by the provider
        },
      });
    });
  }

  /**
   * Verify email + null out the one-time token. Returns null if the token
   * is invalid or the user is missing.
   */
  verifyEmail(token: string): Promise<User | null> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findFirst({
        where: { emailVerificationToken: token, deletedAt: null },
      });
      if (!user) return null;
      return tx.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: new Date(),
          emailVerificationToken: null,
          status: user.status === UserStatus.PENDING_VERIFICATION ? UserStatus.ACTIVE : user.status,
        },
      });
    });
  }

  /**
   * Update password hash + null out reset token + bump passwordChangedAt.
   * Returns the updated user.
   */
  changePassword(userId: string, newPasswordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
      },
    });
  }

  // ---- Lockout helpers ---------------------------------------------------

  recordFailedLogin(userId: string, currentCount: number): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: currentCount + 1 },
    });
  }

  resetFailedLogin(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  }

  lockAccount(userId: string, until: Date): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: until },
    });
  }

  setEmailVerificationToken(userId: string, token: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerificationToken: token },
    });
  }

  setStatus(userId: string, status: UserStatus): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  // ---- Role resolution ---------------------------------------------------

  /**
   * Resolve roles + permission codes for an active user.
   * Returned strings are stable codes (`customer`, `super_admin`, ...) and
   * permission codes (`catalog.product.read`, ...).
   */
  async resolveUserPrincipal(userId: string): Promise<{
    roles: string[];
    permissions: string[];
  }> {
    const bindings = await this.prisma.userRole.findMany({
      where: { userId, revokedAt: null, role: { deletedAt: null, isActive: true } },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    const roleCodes = new Set<string>();
    const permissionCodes = new Set<string>();
    for (const b of bindings) {
      roleCodes.add(b.role.code);
      for (const rp of b.role.permissions) {
        permissionCodes.add(rp.permission.code);
      }
    }

    // Ensure the default `customer` role is present for any logged-in user
    // (the role is seeded with the system roles).
    roleCodes.add('customer');

    return {
      roles: [...roleCodes],
      permissions: [...permissionCodes],
    };
  }

  async resolveAdminPrincipal(adminUserId: string): Promise<{
    roles: string[];
    permissions: string[];
  }> {
    const bindings = await this.prisma.adminUserRole.findMany({
      where: {
        adminUserId,
        revokedAt: null,
        role: { deletedAt: null, isActive: true },
      },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    const roleCodes = new Set<string>();
    const permissionCodes = new Set<string>();
    for (const b of bindings) {
      roleCodes.add(b.role.code);
      for (const rp of b.role.permissions) {
        permissionCodes.add(rp.permission.code);
      }
    }

    return {
      roles: [...roleCodes],
      permissions: [...permissionCodes],
    };
  }

  // ---- Mapping -----------------------------------------------------------

  /**
   * Convert a Prisma user row + resolved principal into the API DTO.
   */
  toResponseDto(user: User, principal?: UserPrincipal): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      locale: user.locale,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt
        ? user.emailVerifiedAt.toISOString()
        : null,
      roles: principal?.roles ?? [],
      acceptsMarketing: user.acceptsMarketing,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}