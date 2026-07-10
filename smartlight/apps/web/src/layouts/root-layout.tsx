/**
 * Top-level customer layout shell with header + footer + outlet.
 *
 * Header features:
 *   - Brand logo
 *   - Primary navigation
 *   - Search box (mobile-toggleable)
 *   - Cart pill (live count from Redux cart slice)
 *   - Auth-aware account menu
 *
 * Theming:
 *   - `theme` is read from the Redux `ui` slice (light | dark).
 *   - We toggle a `dark` class on the root element so Tailwind dark
 *     variants kick in if/when they are added to the design system.
 */
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { Badge, Button } from '@smartlight/ui';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTheme } from '../store/ui-slice';
import { useAuth } from '../contexts/auth-context';
import { fetchCart } from '../store/cart-slice';

export const RootLayout = (): JSX.Element => {
  const { user, logout } = useAuth();
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector((s) => s.ui);
  const { cart } = useAppSelector((s) => s.cart);
  const itemCount = cart?.totals.itemCount ?? 0;

  // Apply dark mode class to root.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  // Hydrate cart on mount (only when authenticated).
  useEffect(() => {
    if (user) void dispatch(fetchCart());
  }, [dispatch, user]);

  return (
    <div className="flex min-h-screen flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to="/" className="text-xl font-semibold text-smart-700">
            SmartLight
          </Link>
          <nav className="flex items-center gap-4 text-sm text-neutral-700 dark:text-neutral-300">
            <NavLink
              to="/products"
              className={({ isActive }) =>
                isActive ? 'font-medium text-smart-700' : 'hover:text-smart-700'
              }
            >
              Sản phẩm
            </NavLink>
            <NavLink
              to="/search"
              className={({ isActive }) =>
                isActive ? 'font-medium text-smart-700' : 'hover:text-smart-700'
              }
            >
              Tìm kiếm
            </NavLink>
            <NavLink
              to="/cart"
              className={({ isActive }) =>
                isActive ? 'font-medium text-smart-700' : 'hover:text-smart-700'
              }
            >
              Giỏ hàng
              {itemCount > 0 && (
                <Badge variant="info" className="ml-1">
                  {itemCount}
                </Badge>
              )}
            </NavLink>
            {user ? (
              <>
                <NavLink
                  to="/orders"
                  className={({ isActive }) =>
                    isActive
                      ? 'font-medium text-smart-700'
                      : 'hover:text-smart-700'
                  }
                >
                  Đơn hàng
                </NavLink>
                <NavLink
                  to="/account"
                  className={({ isActive }) =>
                    isActive
                      ? 'font-medium text-smart-700'
                      : 'hover:text-smart-700'
                  }
                >
                  {user.displayName ?? user.email}
                </NavLink>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void logout()}
                >
                  Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/login">
                  <Button size="sm" variant="ghost">
                    Đăng nhập
                  </Button>
                </NavLink>
                <NavLink to="/register">
                  <Button size="sm" variant="primary">
                    Đăng ký
                  </Button>
                </NavLink>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => dispatch(setTheme(theme === 'dark' ? 'light' : 'dark'))}
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-neutral-200 bg-neutral-50 px-6 py-8 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        <div className="container-page grid gap-6 md:grid-cols-3">
          <div>
            <div className="text-lg font-semibold text-smart-700">SmartLight</div>
            <p className="mt-2 max-w-xs">
              Đèn LED, đèn trang trí, đèn thông minh và đèn năng lượng mặt trời cho
              mọi không gian.
            </p>
          </div>
          <div>
            <div className="mb-2 font-semibold text-neutral-900 dark:text-neutral-100">
              Liên kết nhanh
            </div>
            <ul className="space-y-1">
              <li>
                <Link to="/products" className="hover:underline">
                  Sản phẩm
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:underline">
                  Giỏ hàng
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:underline">
                  Đơn hàng
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="mb-2 font-semibold text-neutral-900 dark:text-neutral-100">
              Hỗ trợ
            </div>
            <ul className="space-y-1">
              <li>Email: support@smartlight.vn</li>
              <li>Hotline: 1900 6868</li>
              <li>Địa chỉ: Hà Nội, Việt Nam</li>
            </ul>
          </div>
        </div>
        <div className="container-page mt-6 flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <span>© {new Date().getFullYear()} SmartLight.</span>
          <Badge variant="info">v0.1.0</Badge>
        </div>
      </footer>
    </div>
  );
};