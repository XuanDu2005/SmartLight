import { Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@smartlight/ui';

import { AdminAuthProvider } from './contexts/auth-context';
import { AdminLayout } from './layouts/admin-layout';
import { ErrorBoundary } from './components/error-boundary';
import { RequireAdminAuth } from './components/require-auth';
import { DashboardPage } from './pages/dashboard-page';
import { ProductsPage } from './pages/products-page';
import { ProductCreatePage } from './pages/product-create-page';
import { ProductDetailPage } from './pages/product-detail-page';
import { ProductEditPage } from './pages/product-edit-page';
import { CategoriesPage } from './pages/categories-page';
import { BrandsPage } from './pages/brands-page';
import { OrdersPage } from './pages/orders-page';
import { OrderDetailPage } from './pages/order-detail-page';
import { InventoryPage } from './pages/inventory-page';
import { PaymentsPage } from './pages/payments-page';
import { PaymentDetailPage } from './pages/payment-detail-page';
import { PromotionsPage } from './pages/promotions-page';
import { UsersPage } from './pages/users-page';
import { ReportsPage } from './pages/reports-page';
import { AuditLogPage } from './pages/audit-log-page';
import { LoginPage } from './pages/login-page';
import { NotFoundPage } from './pages/not-found-page';

/**
 * Admin dashboard router.
 */
export const App = (): JSX.Element => (
  <ErrorBoundary>
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
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/create" element={<ProductCreatePage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/products/:id/edit" element={<ProductEditPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/brands" element={<BrandsPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/payments/:id" element={<PaymentDetailPage />} />
            <Route path="/promotions" element={<PromotionsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/audit" element={<AuditLogPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AdminAuthProvider>
    </ToastProvider>
  </ErrorBoundary>
);