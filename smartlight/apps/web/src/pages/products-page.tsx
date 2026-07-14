import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Badge,
  Card,
  EmptyState,
  FormField,
  Input,
  Pagination,
  Select,
  Spinner,
} from '@smartlight/ui';
import { catalogApi } from '../lib/catalog-api';
import { ProductCard } from '../components/product-card';
import type {
  CategoryTreeNode,
  ProductListItem,
} from '../lib/api-types';

interface CatalogState {
  products: ProductListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export const ProductsPage = (): JSX.Element => {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<CatalogState | null>(null);
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const q = params.get('q') ?? '';
  const categorySlug = params.get('categorySlug') ?? '';
  // Map user-friendly aliases to the backend's strict @IsIn list.
  const rawSort = params.get('sort') ?? 'createdDesc';
  const sort = rawSort === 'newArrivals' ? 'createdDesc' : rawSort;
  const page = Number(params.get('page') ?? 1);
  const limit = 12;

  useEffect(() => {
    const loadTree = async (): Promise<void> => {
      try {
        const tree = await catalogApi.getCategoryTree();
        setCategories(tree);
      } catch {
        setCategories([]);
      }
    };
    void loadTree();
  }, []);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoading(true);
      setErr(null);
      try {
        const res = await catalogApi.listProducts({
          q: q || undefined,
          categorySlug: categorySlug || undefined,
          sort: (sort as 'priceAsc' | 'priceDesc' | 'createdDesc' | 'nameAsc' | 'nameDesc') || undefined,
          page,
          limit,
        });
        const pagination = res.meta?.pagination;
        setData({
          products: res.data,
          total: pagination?.totalItems ?? res.data.length,
          page: pagination?.page ?? page,
          totalPages: pagination?.totalPages ?? 1,
        });
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Lỗi');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [q, categorySlug, sort, page]);

  const handleParam = (k: string, v: string): void => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    next.delete('page'); // reset page on filter change
    setParams(next, { replace: true });
  };

  const handlePage = (newPage: number): void => {
    const next = new URLSearchParams(params);
    next.set('page', String(newPage));
    setParams(next);
  };

  const totalLabel = useMemo(() => {
    if (!data) return '';
    if (data.total === 0) return 'Không có sản phẩm';
    return `Hiển thị ${(data.page - 1) * limit + 1}–${Math.min(
      data.page * limit,
      data.total,
    )} / ${data.total}`;
  }, [data]);

  return (
    <section className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">Sản phẩm</h1>
        <Badge variant="neutral">{totalLabel}</Badge>
      </div>
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <Card>
            <FormField label="Tìm kiếm" htmlFor="search">
              <Input
                id="search"
                placeholder="Tên sản phẩm..."
                defaultValue={q}
                onBlur={(e) => handleParam('q', e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleParam('q', e.currentTarget.value);
                  }
                }}
              />
            </FormField>
            <FormField label="Danh mục" htmlFor="category" className="mt-3">
              <Select
                id="category"
                value={categorySlug}
                onChange={(e) => handleParam('categorySlug', e.currentTarget.value)}
              >
                <option value="">Tất cả</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Sắp xếp" htmlFor="sort" className="mt-3">
              <Select
                id="sort"
                value={sort}
                onChange={(e) => handleParam('sort', e.currentTarget.value)}
              >
                <option value="createdDesc">Mới nhất</option>
                <option value="priceAsc">Giá tăng dần</option>
                <option value="priceDesc">Giá giảm dần</option>
                <option value="nameAsc">Tên A-Z</option>
                <option value="nameDesc">Tên Z-A</option>
              </Select>
            </FormField>
          </Card>
        </aside>

        <div>
          {loading && (
            <div className="flex h-64 items-center justify-center">
              <Spinner size="lg" />
            </div>
          )}
          {!loading && err && (
            <EmptyState
              title="Đã xảy ra lỗi"
              description={err}
            />
          )}
          {!loading && !err && data && data.products.length === 0 && (
            <EmptyState
              title="Không tìm thấy sản phẩm"
              description="Thử thay đổi bộ lọc hoặc từ khóa khác."
            />
          )}
          {!loading && data && data.products.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {data.products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <div className="mt-6 flex justify-center">
                <Pagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onPageChange={handlePage}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
