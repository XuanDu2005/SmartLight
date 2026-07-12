/**
 * Admin auth: login/refresh/logout against /v1/auth/admin/*.
 */
import { apiClient, clearAccessToken, setAccessToken } from './api-client';

export interface AdminPrincipal {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  mustChangePassword: boolean;
  roles: string[];
  permissions: string[];
}

interface AdminTokenPairResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  admin: AdminPrincipal;
}

export const adminAuthApi = {
  async login(email: string, password: string): Promise<{ user: AdminPrincipal }> {
    const res = await apiClient.post<AdminTokenPairResponse>(
      '/auth/admin/login',
      { email, password },
    );
    if (res.data.accessToken) {
      setAccessToken(res.data.accessToken);
    }
    return { user: res.data.admin };
  },
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/admin/logout');
    } catch {
      // ignore — local state cleared either way
    } finally {
      clearAccessToken();
    }
  },
  async refresh(): Promise<{ user: AdminPrincipal }> {
    const res = await apiClient.post<AdminTokenPairResponse>('/auth/admin/refresh');
    if (res.data.accessToken) {
      setAccessToken(res.data.accessToken);
    }
    return { user: res.data.admin };
  },
};