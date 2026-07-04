import { Routes, Route } from 'react-router-dom';

import { RootLayout } from './layouts/root-layout';
import { HomePage } from './pages/home-page';
import { ProductsPage } from './pages/products-page';
import { ProductDetailPage } from './pages/product-detail-page';
import { CartPage } from './pages/cart-page';
import { CheckoutPage } from './pages/checkout-page';
import { NotFoundPage } from './pages/not-found-page';

/**
 * Customer storefront router.
 * Bootstrap only \u2014 no business logic yet.
 */
export const App = (): JSX.Element => (
  <Routes>
    <Route element={<RootLayout />}>
      <Route index element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:slug" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
