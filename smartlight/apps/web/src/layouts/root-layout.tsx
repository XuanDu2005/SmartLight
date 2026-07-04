import { Link, Outlet } from 'react-router-dom';

/**
 * Top-level customer layout shell.
 * Bootstrap only \u2014 design system components land in V1.1.
 */
export const RootLayout = (): JSX.Element => (
  <div className="min-h-screen flex flex-col">
    <header className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
      <Link to="/" className="text-xl font-semibold">
        SmartLight
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link to="/products" className="hover:underline">
          S\u1ea3n ph\u1ea9m
        </Link>
        <Link to="/cart" className="hover:underline">
          Gi\u1ecf h\u00e0ng
        </Link>
      </nav>
    </header>

    <main className="flex-1">
      <Outlet />
    </main>

    <footer className="border-t border-neutral-200 px-6 py-6 text-sm text-neutral-600">
      \u00a9 {new Date().getFullYear()} SmartLight. All rights reserved.
    </footer>
  </div>
);
