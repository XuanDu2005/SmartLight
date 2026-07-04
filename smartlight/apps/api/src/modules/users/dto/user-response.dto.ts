/**
 * Public response DTO for a User.
 * Mirrors the shape returned by `GET /v1/auth/me` and `GET /v1/users/me`.
 * Password hash, MFA secret, and other sensitive fields are NEVER included.
 */
import { UserStatus } from '@prisma/client';

export interface UserResponseDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  locale: string;
  status: UserStatus;
  emailVerifiedAt: string | null;
  roles: string[];
  acceptsMarketing: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentUserResponseDto {
  user: UserResponseDto;
}