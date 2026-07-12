/**
 * Auth API + principal shape.
 */
import { apiClient, clearAccessToken, setAccessToken } from './api-client';

export interface UserPrincipal {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  roles: string[];
}

interface CustomerTokenPairResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number | string;
  tokenType: 'Bearer';
  user: UserPrincipal;
}

interface MeResponse {
  user: UserPrincipal;
}

export const authApi = {
  async login(email: string, password: string, remember = false) {
    const res = await apiClient.post<CustomerTokenPairResponse>('/auth/login', {
      email,
      password,
      rememberMe: remember,
    });
    if (res.data.accessToken) {
      setAccessToken(res.data.accessToken);
    }
    return { user: res.data.user, accessToken: res.data.accessToken };
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
    const res = await apiClient.post<CustomerTokenPairResponse>('/auth/refresh');
    if (res.data.accessToken) {
      setAccessToken(res.data.accessToken);
    }
    return { user: res.data.user, accessToken: res.data.accessToken };
  },

  async me() {
    const res = await apiClient.get<MeResponse>('/auth/me');
    return res.data.user;
  },
};

export type AuthPrincipal = UserPrincipal;
