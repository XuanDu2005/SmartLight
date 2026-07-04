import { Routes, Route } from 'react-router-dom';

import { AdminLayout } from './layouts/admin-layout';
import { DashboardPage } from './pages/dashboard-page';
import { ProductsPage } from './pages/products-page';
import { OrdersPage } from './pages/orders-page';
import { UsersPage } from './pages/users-page';
import { AuditLogPage } from './pages/audit-log-page';
import { NotFoundPage } from './pages/not-found-page';

/**
 * Admin dashboard router. Bootstrap only.
 */
export const App = (): JSX.Element => (
  <Routes>
    <Route element={<AdminLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/users" element={<UsersPage />} />
      <Route path="/audit" element={<AuditLogPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
