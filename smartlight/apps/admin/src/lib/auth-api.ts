/**
 * Admin auth: login/refresh/logout against /v1/auth/admin/*.
 */
import { apiClient, clearAccessToken, setAccessToken } from './api-client';

export interface AdminPrincipal {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  roles: string[];
  permissions: string[];
}

export const adminAuthApi = {
  async login(email: string, password: string) {
    const res = await apiClient.post<{
      data: { user: AdminPrincipal; accessToken: string };
    }>('/auth/admin/login', { email, password });
    if (res.data.data.accessToken) {
      setAccessToken(res.data.data.accessToken);
    }
    return res.data.data;
  },
  async logout() {
    try {
      await apiClient.post('/auth/admin/logout');
    } catch {
      // ignore
    } finally {
      clearAccessToken();
    }
  },
  async refresh() {
    const res = await apiClient.post<{
      data: { user: AdminPrincipal; accessToken: string };
    }>('/auth/admin/refresh');
    if (res.data.data.accessToken) {
      setAccessToken(res.data.data.accessToken);
    }
    return res.data.data;
  },
};