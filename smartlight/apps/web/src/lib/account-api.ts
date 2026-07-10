/**
 * Account / profile API client — wraps /v1/users/me/* endpoints.
 */
import { apiClient } from './api-client';

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

export const accountApi = {
  async getMe(): Promise<AccountProfile> {
    const res = await apiClient.get<{ data: AccountProfile }>('/users/me');
    return res.data.data;
  },

  async updateMe(input: Partial<AccountProfile>): Promise<AccountProfile> {
    const res = await apiClient.put<{ data: AccountProfile }>('/users/me', input);
    return res.data.data;
  },

  async changePassword(current: string, next: string): Promise<void> {
    await apiClient.post('/users/me/change-password', {
      currentPassword: current,
      newPassword: next,
    });
  },

  async listAddresses(): Promise<AccountAddress[]> {
    const res = await apiClient.get<{ data: AccountAddress[] }>('/users/me/addresses');
    return res.data.data ?? [];
  },

  async createAddress(input: Omit<AccountAddress, 'id'>): Promise<AccountAddress> {
    const res = await apiClient.post<{ data: AccountAddress }>('/users/me/addresses', input);
    return res.data.data;
  },

  async deleteAddress(id: string): Promise<void> {
    await apiClient.delete(`/users/me/addresses/${id}`);
  },
};