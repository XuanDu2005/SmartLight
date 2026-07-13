import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { adminAuthApi, type AdminPrincipal } from '../lib/auth-api';
import { ApiError } from '../lib/api-client';

export interface AdminAuthContextValue {
  user: AdminPrincipal | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export const useAdminAuth = (): AdminAuthContextValue => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within <AdminAuthProvider>');
  }
  return ctx;
};

const SESSION_FLAG_KEY = 'smartlight.admin.hasSession';

export const AdminAuthProvider = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const [user, setUser] = useState<AdminPrincipal | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    // First-visit users have no session yet — skip refresh to keep
    // the browser console free of expected 401s.
    const hasSession =
      typeof window !== 'undefined' &&
      window.localStorage.getItem(SESSION_FLAG_KEY) === '1';
    if (!hasSession) {
      setUser(null);
      setIsBootstrapping(false);
      return;
    }
    adminAuthApi
      .refresh()
      .then((res) => setUser(res.user))
      .catch((err) => {
        if (err instanceof ApiError && err.httpStatus === 401) {
          setUser(null);
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(SESSION_FLAG_KEY);
          }
        }
      })
      .finally(() => setIsBootstrapping(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await adminAuthApi.login(email, password);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_FLAG_KEY, '1');
    }
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await adminAuthApi.logout();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_FLAG_KEY);
    }
    setUser(null);
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isBootstrapping,
      login,
      logout,
    }),
    [user, isBootstrapping, login, logout],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};