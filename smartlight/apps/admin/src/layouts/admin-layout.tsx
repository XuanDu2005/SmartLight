import { Link, NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'T\u1ed5ng quan', end: true },
  { to: '/products', label: 'S\u1ea3n ph\u1ea9m' },
  { to: '/orders', label: '\u0110\u01a1n h\u00e0ng' },
  { to: '/users', label: 'Ng\u01b0\u1eddi d\u00f9ng' },
  { to: '/audit', label: 'Audit Log' },
];

/**
 * Admin shell layout: sidebar + main content.
 */
export const AdminLayout = (): JSX.Element => (
  <div className="min-h-screen flex bg-neutral-100 text-neutral-900">
    <aside className="w-60 bg-neutral-900 text-neutral-100 flex flex-col">
      <div className="px-5 py-5 text-lg font-semibold border-b border-neutral-800">
        <Link to="/">SmartLight Admin</Link>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `block px-3 py-2 rounded text-sm ${
                isActive ? 'bg-neutral-800 text-white' : 'hover:bg-neutral-800'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-3 text-xs text-neutral-500 border-t border-neutral-800">
        v0.1.0 \u00b7 bootstrap
      </div>
    </aside>
    <main className="flex-1 overflow-auto">
      <Outlet />
    </main>
  </div>
);
