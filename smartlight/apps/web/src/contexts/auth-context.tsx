/**
 * AuthProvider + useAuth hook.
 *
 * On mount, attempts `/auth/refresh` so HTTP-only refresh-token cookie
 * hydrates the session silently; if it fails, stays logged out.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi, type UserPrincipal } from '../lib/auth-api';
import { ApiError } from '../lib/api-client';

export interface AuthContextValue {
  user: UserPrincipal | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [user, setUser] = useState<UserPrincipal | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const res = await authApi.refresh();
      setUser(res.user);
    } catch (err) {
      if (err instanceof ApiError && err.httpStatus === 401) {
        setUser(null);
      }
      // network errors also leave the user null and we move on
    } finally {
      setIsBootstrapping(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (email: string, password: string, remember = false) => {
      const res = await authApi.login(email, password, remember);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isBootstrapping,
      login,
      logout,
    }),
    [user, isBootstrapping, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
