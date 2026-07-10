import { Link, NavLink, Outlet } from 'react-router-dom';
import { Badge, Button } from '@smartlight/ui';
import { useAdminAuth } from '../contexts/auth-context';

const navItems = [
  { to: '/', label: 'Tổng quan', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/products', label: 'Sản phẩm' },
  { to: '/categories', label: 'Danh mục' },
  { to: '/brands', label: 'Thương hiệu' },
  { to: '/orders', label: 'Đơn hàng' },
  { to: '/inventory', label: 'Tồn kho' },
  { to: '/payments', label: 'Thanh toán' },
  { to: '/promotions', label: 'Khuyến mãi' },
  { to: '/users', label: 'Người dùng' },
  { to: '/reports', label: 'Báo cáo' },
  { to: '/audit', label: 'Audit Log' },
];

/**
 * Admin shell layout: sidebar + main content. Pulls auth state
 * from <AdminAuthProvider> to display current user + logout.
 */
export const AdminLayout = (): JSX.Element => {
  const { user, logout } = useAdminAuth();

  return (
    <div className="flex min-h-screen bg-neutral-100 text-neutral-900">
      <aside className="flex w-60 flex-col bg-neutral-900 text-neutral-100">
        <div className="border-b border-neutral-800 px-5 py-5 text-lg font-semibold">
          <Link to="/">SmartLight Admin</Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'block rounded px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-smart-600 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-white',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-neutral-800 px-5 py-3 text-xs text-neutral-500">
          v0.1.0
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-6">
          <div className="flex items-center gap-2">
            <Badge variant="info">Admin</Badge>
            <span className="text-sm text-neutral-500">
              {user?.displayName ?? user?.email ?? 'Admin'}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void logout()}
          >
            Đăng xuất
          </Button>
        </div>
        <Outlet />
      </main>
    </div>
  );
};