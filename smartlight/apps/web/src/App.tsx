import { Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@smartlight/ui';

import { AuthProvider } from './contexts/auth-context';
import { RootLayout } from './layouts/root-layout';
import { RequireAuth } from './components/require-auth';
import { HomePage } from './pages/home-page';
import { ProductsPage } from './pages/products-page';
import { ProductDetailPage } from './pages/product-detail-page';
import { CategoryPage } from './pages/category-page';
import { SearchPage } from './pages/search-page';
import { CartPage } from './pages/cart-page';
import { CheckoutPage } from './pages/checkout-page';
import { LoginPage } from './pages/login-page';
import { RegisterPage } from './pages/register-page';
import { AccountPage } from './pages/account-page';
import { OrdersPage } from './pages/orders-page';
import { OrderDetailPage } from './pages/order-detail-page';
import { NotFoundPage } from './pages/not-found-page';

/**
 * Customer storefront router.
 */
export const App = (): JSX.Element => (
  <ToastProvider>
    <AuthProvider>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/checkout"
            element={
              <RequireAuth>
                <CheckoutPage />
              </RequireAuth>
            }
          />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            }
          />
          <Route
            path="/orders"
            element={
              <RequireAuth>
                <OrdersPage />
              </RequireAuth>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <RequireAuth>
                <OrderDetailPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  </ToastProvider>
);