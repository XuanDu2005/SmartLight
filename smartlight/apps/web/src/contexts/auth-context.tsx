/**
 * AuthProvider + useAuth hook.
 *
 * On mount, attempts `/auth/refresh` so the HTTP-only refresh-token
 * cookie can hydrate the session silently. To avoid a noisy 401 in the
 * browser console on first-visit (no cookie yet), we only attempt the
 * refresh when the user has previously logged in on this device (we
 * remember that via a `hasSession` flag in localStorage; login sets it,
 * logout clears it). On a true first visit, we skip the call entirely
 * and render the app as logged-out.
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

const SESSION_FLAG_KEY = 'smartlight.web.hasSession';

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
    // First-visit users have no session yet — skip the refresh call so
    // we don't log a 401 in the browser console.
    const hasSession =
      typeof window !== 'undefined' &&
      window.localStorage.getItem(SESSION_FLAG_KEY) === '1';
    if (!hasSession) {
      setUser(null);
      setIsBootstrapping(false);
      return;
    }
    try {
      const res = await authApi.refresh();
      setUser(res.user);
    } catch (err) {
      if (err instanceof ApiError && err.httpStatus === 401) {
        setUser(null);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(SESSION_FLAG_KEY);
        }
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
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SESSION_FLAG_KEY, '1');
      }
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_FLAG_KEY);
    }
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
