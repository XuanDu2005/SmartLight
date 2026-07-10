/**
 * Search page — text-driven product search.
 *
 * Reads `?q=` from the URL so the page is shareable.
 */
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Card,
  EmptyState,
  FormField,
  Input,
  Pagination,
  Spinner,
} from '@smartlight/ui';
import { catalogApi } from '../lib/catalog-api';
import { ProductCard } from '../components/product-card';
import type { ProductListItem } from '../lib/api-types';

export const SearchPage = (): JSX.Element => {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') ?? 1);
  const [results, setResults] = useState<ProductListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState(q);
  const limit = 12;

  useEffect(() => {
    setInput(q);
  }, [q]);

  useEffect(() => {
    if (!q) {
      setResults([]);
      setTotal(0);
      setTotalPages(1);
      return;
    }
    setLoading(true);
    catalogApi
      .listProducts({ q, page, limit })
      .then((res) => {
        setResults(res.data);
        const p = res.meta?.pagination;
        setTotal(p?.totalItems ?? res.data.length);
        setTotalPages(p?.totalPages ?? 1);
      })
      .catch(() => {
        setResults([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [q, page]);

  const onSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (input.trim()) next.set('q', input.trim());
    else next.delete('q');
    next.delete('page');
    setParams(next, { replace: true });
  };

  const handlePage = (newPage: number): void => {
    const next = new URLSearchParams(params);
    next.set('page', String(newPage));
    setParams(next);
  };

  return (
    <section className="container-page py-8">
      <h1 className="mb-4 text-2xl font-semibold text-neutral-900">Tìm kiếm</h1>

      <Card className="mb-6">
        <form onSubmit={onSubmit}>
          <FormField label="Từ khóa" htmlFor="q">
            <Input
              id="q"
              placeholder="Tìm đèn LED, đèn trang trí, ..."
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
            />
          </FormField>
        </form>
      </Card>

      {q && (
        <p className="mb-3 text-sm text-neutral-500">
          Kết quả cho <strong className="text-neutral-900">"{q}"</strong> —{' '}
          {total} sản phẩm
        </p>
      )}

      {loading && (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}

      {!loading && !q && (
        <EmptyState
          title="Nhập từ khóa để bắt đầu"
          description="Tìm kiếm theo tên sản phẩm, thương hiệu hoặc mô tả."
        />
      )}

      {!loading && q && results && results.length === 0 && (
        <EmptyState
          title="Không tìm thấy kết quả"
          description={`Không có sản phẩm nào khớp với "${q}".`}
          action={
            <Link
              to="/products"
              className="text-smart-700 underline"
            >
              Xem tất cả sản phẩm
            </Link>
          }
        />
      )}

      {!loading && results && results.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePage}
            />
          </div>
        </>
      )}
    </section>
  );
};