/**
 * Auth API + principal shape.
 */
import { apiClient, clearAccessToken, setAccessToken } from './api-client';

export interface UserPrincipal {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
  permissions: string[];
}

export interface LoginResponse {
  data: {
    user: UserPrincipal;
    accessToken: string;
  };
}

export const authApi = {
  async login(email: string, password: string, remember = false) {
    const res = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
      remember,
    });
    if (res.data.data.accessToken) {
      setAccessToken(res.data.data.accessToken);
    }
    return res.data.data;
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore \u2014 logout is best-effort
    } finally {
      clearAccessToken();
    }
  },

  async refresh() {
    const res = await apiClient.post<LoginResponse>('/auth/refresh');
    if (res.data.data.accessToken) {
      setAccessToken(res.data.data.accessToken);
    }
    return res.data.data;
  },

  async me() {
    const res = await apiClient.get<{ data: { user: UserPrincipal } }>('/auth/me');
    return res.data.data.user;
  },
};

export type AuthPrincipal = UserPrincipal;
