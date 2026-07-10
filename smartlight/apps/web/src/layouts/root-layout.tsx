import { Link, NavLink, Outlet } from 'react-router-dom';
import { Badge, Button } from '@smartlight/ui';
import { useAuth } from '../contexts/auth-context';

/**
 * Top-level customer layout shell with header + footer + outlet.
 * Loads Tailwind compiled by Vite/PostCSS.
 */
export const RootLayout = (): JSX.Element => {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-neutral-200 bg-white">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to="/" className="text-xl font-semibold text-smart-700">
            SmartLight
          </Link>
          <nav className="flex items-center gap-4 text-sm text-neutral-700">
            <NavLink
              to="/products"
              className={({ isActive }) =>
                isActive ? 'font-medium text-smart-700' : 'hover:text-smart-700'
              }
            >
              Sản phẩm
            </NavLink>
            <NavLink
              to="/cart"
              className={({ isActive }) =>
                isActive ? 'font-medium text-smart-700' : 'hover:text-smart-700'
              }
            >
              Giỏ hàng
            </NavLink>
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden text-neutral-500 sm:inline">
                  {user.displayName ?? user.email}
                </span>
                <Button size="sm" variant="ghost" onClick={() => void logout()}>
                  Đăng xuất
                </Button>
              </div>
            ) : (
              <NavLink to="/login">
                <Button size="sm" variant="primary">
                  Đăng nhập
                </Button>
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-neutral-200 px-6 py-6 text-sm text-neutral-500">
        <div className="container-page flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} SmartLight.</span>
          <Badge variant="info">v0.1.0</Badge>
        </div>
      </footer>
    </div>
  );
};
