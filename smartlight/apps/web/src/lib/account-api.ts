/**
 * Account / profile API client.
 *
 * Profile reads go through `/v1/auth/me` (the canonical current-user
 * endpoint exposed by the auth controller). Profile mutations live
 * behind `/v1/users/me/*` once the V1.1 user-management endpoints
 * ship — until then those calls throw `ApiError(NOT_IMPLEMENTED)` so
 * the UI can render a clear "coming soon" state instead of failing
 * silently with a 404.
 */
import { ApiError, apiClient } from './api-client';

export interface AccountProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountAddress {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detail: string;
  isDefault: boolean;
}

interface AuthMeResponse {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    status: string;
    emailVerifiedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

class NotImplementedError extends ApiError {
  constructor(method: string) {
    super(
      'NOT_IMPLEMENTED',
      `${method} sẽ được hỗ trợ ở V1.1 — xem USER_API.md`,
      501,
    );
  }
}

export const accountApi = {
  async getMe(): Promise<AccountProfile> {
    const res = await apiClient.get<AuthMeResponse>('/auth/me');
    const u = res.data.user;
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      displayName: [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      status: u.status,
      emailVerified: Boolean(u.emailVerifiedAt),
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  },

  async updateMe(_input: Partial<AccountProfile>): Promise<AccountProfile> {
    throw new NotImplementedError('Cập nhật hồ sơ');
  },

  async changePassword(current: string, next: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      currentPassword: current,
      newPassword: next,
    });
  },

  async listAddresses(): Promise<AccountAddress[]> {
    throw new NotImplementedError('Danh sách địa chỉ');
  },

  async createAddress(_input: Omit<AccountAddress, 'id'>): Promise<AccountAddress> {
    throw new NotImplementedError('Thêm địa chỉ');
  },

  async deleteAddress(_id: string): Promise<void> {
    throw new NotImplementedError('Xóa địa chỉ');
  },
};