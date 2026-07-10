/**
 * Category page — products filtered by category slug.
 *
 * Mirrors the products listing page but is keyed off `/category/:slug`
 * for clean SEO-friendly URLs.
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Pagination,
  Spinner,
} from '@smartlight/ui';
import { catalogApi } from '../lib/catalog-api';
import { ProductCard } from '../components/product-card';
import type { ProductListItem } from '../lib/api-types';

export const CategoryPage = (): JSX.Element => {
  const { slug = '' } = useParams<{ slug: string }>();
  const [products, setProducts] = useState<ProductListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categoryName, setCategoryName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const limit = 12;

  useEffect(() => {
    setPage(1);
  }, [slug]);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoading(true);
      setErr(null);
      try {
        const tree = await catalogApi.getCategoryTree();
        const flat: Array<{ id: string; name: string; slug: string }> = [];
        const walk = (nodes: typeof tree): void => {
          for (const n of nodes) {
            flat.push({ id: n.id, name: n.name, slug: n.slug });
            if (n.children?.length) walk(n.children);
          }
        };
        walk(tree);
        const found = flat.find((c) => c.slug === slug);
        setCategoryName(found?.name ?? slug);
      } catch {
        setCategoryName(slug);
      }
      try {
        const res = await catalogApi.listProducts({
          categorySlug: slug,
          page,
          limit,
        });
        setProducts(res.data);
        const p = res.meta?.pagination;
        setTotal(p?.totalItems ?? res.data.length);
        setTotalPages(p?.totalPages ?? 1);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Lỗi');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [slug, page]);

  return (
    <section className="container-page py-8">
      <nav className="mb-3 text-sm text-neutral-500">
        <Link to="/" className="hover:underline">
          Trang chủ
        </Link>{' '}
        / <span className="text-neutral-700">Danh mục</span> /{' '}
        <span className="text-neutral-900">{categoryName || slug}</span>
      </nav>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{categoryName || 'Danh mục'}</CardTitle>
          <span className="text-sm text-neutral-500">{total} sản phẩm</span>
        </CardHeader>
      </Card>

      {loading && (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}
      {!loading && err && <EmptyState title="Đã xảy ra lỗi" description={err} />}
      {!loading && !err && products && products.length === 0 && (
        <EmptyState
          title="Danh mục chưa có sản phẩm"
          description="Vui lòng quay lại sau."
        />
      )}
      {!loading && products && products.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </section>
  );
};