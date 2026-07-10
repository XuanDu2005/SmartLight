import { Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@smartlight/ui';

import { AdminAuthProvider } from './contexts/auth-context';
import { AdminLayout } from './layouts/admin-layout';
import { RequireAdminAuth } from './components/require-auth';
import { DashboardPage } from './pages/dashboard-page';
import { ProductsPage } from './pages/products-page';
import { OrdersPage } from './pages/orders-page';
import { UsersPage } from './pages/users-page';
import { AuditLogPage } from './pages/audit-log-page';
import { LoginPage } from './pages/login-page';
import { NotFoundPage } from './pages/not-found-page';

/**
 * Admin dashboard router.
 */
export const App = (): JSX.Element => (
  <ToastProvider>
    <AdminAuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAdminAuth>
              <AdminLayout />
            </RequireAdminAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AdminAuthProvider>
  </ToastProvider>
);