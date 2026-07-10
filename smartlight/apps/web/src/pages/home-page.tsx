import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Spinner,
} from '@smartlight/ui';
import { catalogApi } from '../lib/catalog-api';
import { ProductCard } from '../components/product-card';
import type {
  CategoryTreeNode,
  ProductListItem,
} from '../lib/api-types';

export const HomePage = (): JSX.Element => {
  const [featured, setFeatured] = useState<ProductListItem[] | null>(null);
  const [newArrivals, setNewArrivals] = useState<ProductListItem[] | null>(null);
  const [categories, setCategories] = useState<CategoryTreeNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const [f, n, c] = await Promise.all([
          catalogApi.listFeatured(8),
          catalogApi.listNewArrivals(8),
          catalogApi.getCategoryTree().catch(() => []),
        ]);
        setFeatured(f);
        setNewArrivals(n);
        setCategories(c);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
      }
    };
    void load();
  }, []);

  if (error) {
    return (
      <section className="container-page py-12">
        <EmptyState
          title="Không tải được dữ liệu"
          description={error}
          action={
            <Button variant="primary" onClick={() => window.location.reload()}>
              Tải lại
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-smart-50 to-white py-16">
        <div className="container-page text-center">
          <Badge variant="info" className="mb-4">
            Thương mại điện tử đèn chiếu sáng
          </Badge>
          <h1 className="text-4xl font-bold text-neutral-900 sm:text-5xl">
            SmartLight – ánh sáng cho mọi không gian
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-neutral-600">
            Đèn LED, đèn trang trí, đèn thông minh và đèn năng lượng mặt trời.
            Miễn phí vận chuyển cho đơn từ 500.000đ.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/products">
              <Button variant="primary" size="lg">
                Khám phá sản phẩm
              </Button>
            </Link>
            <Link to="/products?sort=newArrivals">
              <Button variant="outline" size="lg">
                Sản phẩm mới
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-12">
        <CardHeader>
          <CardTitle>Danh mục nổi bật</CardTitle>
          <Link to="/products" className="text-sm text-smart-700 hover:underline">
            Xem tất cả
          </Link>
        </CardHeader>
        {categories === null ? (
          <Spinner />
        ) : categories.length === 0 ? (
          <EmptyState title="Chưa có danh mục" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {categories.slice(0, 8).map((c) => (
              <Link
                key={c.id}
                to={`/products?categorySlug=${c.slug}`}
                className="rounded-lg border border-neutral-200 bg-white p-4 text-center shadow-card transition hover:border-smart-500"
              >
                <span className="text-sm font-medium text-neutral-900">
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured */}
      <section className="container-page py-8">
        <Card>
          <CardHeader>
            <CardTitle>Sản phẩm nổi bật</CardTitle>
            <Link to="/products?featured=true" className="text-sm text-smart-700 hover:underline">
              Xem tất cả
            </Link>
          </CardHeader>
          {featured === null ? (
            <Spinner />
          ) : featured.length === 0 ? (
            <EmptyState title="Chưa có sản phẩm nổi bật" />
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* New arrivals */}
      <section className="container-page py-8">
        <Card>
          <CardHeader>
            <CardTitle>Sản phẩm mới về</CardTitle>
          </CardHeader>
          {newArrivals === null ? (
            <Spinner />
          ) : newArrivals.length === 0 ? (
            <EmptyState title="Chưa có sản phẩm mới" />
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {newArrivals.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
};
