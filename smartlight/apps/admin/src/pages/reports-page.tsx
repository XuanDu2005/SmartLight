import { useEffect, useState } from 'react';
import {
  Breadcrumb,
  Button,
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Tabs,
  useToast,
} from '@smartlight/ui';
import { format } from 'date-fns';
import { reportsApi } from '../lib/reports-api';
import {
  type ExportColumn,
  exportCSV,
  exportPDF,
  exportXLSX,
} from '../lib/exporters';
import { formatVND } from '../lib/format';
import type {
  CustomersReportRow,
  InventoryReportRow,
  OrdersReportRow,
  ProductsReportRow,
  RevenueReportRow,
} from '../lib/types';

const todayIso = (): string => format(new Date(), 'yyyy-MM-dd');
const monthAgoIso = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return format(d, 'yyyy-MM-dd');
};

export const ReportsPage = (): JSX.Element => {
  const { push } = useToast();
  const [from, setFrom] = useState<string>(monthAgoIso());
  const [to, setTo] = useState<string>(todayIso());
  const [tab, setTab] = useState('revenue');
  const [revenue, setRevenue] = useState<RevenueReportRow[]>([]);
  const [orders, setOrders] = useState<OrdersReportRow[]>([]);
  const [products, setProducts] = useState<ProductsReportRow[]>([]);
  const [customers, setCustomers] = useState<CustomersReportRow[]>([]);
  const [inventory, setInventory] = useState<InventoryReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = async (): Promise<void> => {
    setLoading(true);
    try {
      const [rev, ord, prod, cust, inv] = await Promise.all([
        reportsApi.revenue({ from, to }),
        reportsApi.orders({ from, to }),
        reportsApi.products({ from, to }),
        reportsApi.customers({ from, to }),
        reportsApi.inventory(),
      ]);
      setRevenue(rev);
      setOrders(ord);
      setProducts(prod);
      setCustomers(cust);
      setInventory(inv);
    } catch (e) {
      push({
        variant: 'error',
        title: 'Lỗi tải báo cáo',
        description: e instanceof Error ? e.message : '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revenueCols: ExportColumn<RevenueReportRow>[] = [
    { key: 'date', header: 'Ngày' },
    {
      key: 'grossRevenue',
      header: 'Doanh thu (VND)',
      get: (r) => r.grossRevenue,
    },
    {
      key: 'orderCount',
      header: 'Số đơn',
      get: (r) => r.orderCount,
    },
  ];

  const ordersCols: ExportColumn<OrdersReportRow>[] = [
    { key: 'date', header: 'Ngày' },
    { key: 'orderCount', header: 'Tổng đơn' },
    { key: 'paidCount', header: 'Đã thanh toán' },
    { key: 'cancelledCount', header: 'Huỷ' },
    { key: 'refundedCount', header: 'Hoàn tiền' },
  ];

  const productsCols: ExportColumn<ProductsReportRow>[] = [
    { key: 'productName', header: 'Sản phẩm' },
    { key: 'unitsSold', header: 'Đã bán' },
    { key: 'revenue', header: 'Doanh thu' },
    { key: 'stockRemaining', header: 'Tồn kho' },
  ];

  const customersCols: ExportColumn<CustomersReportRow>[] = [
    { key: 'email', header: 'Email' },
    { key: 'fullName', header: 'Tên' },
    { key: 'orderCount', header: 'Số đơn' },
    { key: 'totalSpend', header: 'Tổng chi' },
  ];

  const inventoryCols: ExportColumn<InventoryReportRow>[] = [
    { key: 'productName', header: 'Sản phẩm' },
    { key: 'sku', header: 'SKU' },
    { key: 'onHand', header: 'Tồn' },
    { key: 'available', header: 'Khả dụng' },
    { key: 'reserved', header: 'Đặt trước' },
    { key: 'threshold', header: 'Ngưỡng' },
    { key: 'status', header: 'Trạng thái' },
  ];

  const exportRow = (kind: 'csv' | 'xlsx' | 'pdf') => (): void => {
    try {
      if (tab === 'revenue') {
        if (kind === 'csv') exportCSV(revenue, revenueCols, 'revenue');
        else if (kind === 'xlsx') exportXLSX(revenue, revenueCols, 'revenue');
        else void exportPDF(revenue, revenueCols, 'revenue', 'Doanh thu');
      } else if (tab === 'orders') {
        if (kind === 'csv') exportCSV(orders, ordersCols, 'orders');
        else if (kind === 'xlsx') exportXLSX(orders, ordersCols, 'orders');
        else void exportPDF(orders, ordersCols, 'orders', 'Đơn hàng');
      } else if (tab === 'products') {
        if (kind === 'csv') exportCSV(products, productsCols, 'products');
        else if (kind === 'xlsx') exportXLSX(products, productsCols, 'products');
        else void exportPDF(products, productsCols, 'products', 'Sản phẩm');
      } else if (tab === 'customers') {
        if (kind === 'csv') exportCSV(customers, customersCols, 'customers');
        else if (kind === 'xlsx')
          exportXLSX(customers, customersCols, 'customers');
        else void exportPDF(customers, customersCols, 'customers', 'Khách hàng');
      } else if (tab === 'inventory') {
        if (kind === 'csv') exportCSV(inventory, inventoryCols, 'inventory');
        else if (kind === 'xlsx')
          exportXLSX(inventory, inventoryCols, 'inventory');
        else void exportPDF(inventory, inventoryCols, 'inventory', 'Tồn kho');
      }
      push({ variant: 'success', title: `Đã xuất ${kind.toUpperCase()}` });
    } catch (e) {
      push({
        variant: 'error',
        title: 'Lỗi xuất file',
        description: e instanceof Error ? e.message : '',
      });
    }
  };

  return (
    <section className="container-page py-6">
      <Breadcrumb
        items={[{ label: 'Admin', href: '/' }, { label: 'Báo cáo' }]}
        className="mb-3"
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Báo cáo</h1>
          <p className="text-sm text-neutral-500">
            Phân tích doanh thu, đơn hàng, sản phẩm, khách hàng và tồn kho
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="block text-xs text-neutral-500">Từ ngày</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-neutral-500">Đến ngày</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <Button onClick={() => void reload()} isLoading={loading}>
            Áp dụng
          </Button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={exportRow('csv')}>
          CSV
        </Button>
        <Button variant="ghost" size="sm" onClick={exportRow('xlsx')}>
          Excel
        </Button>
        <Button variant="ghost" size="sm" onClick={exportRow('pdf')}>
          PDF
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { key: 'revenue', label: 'Doanh thu', count: revenue.length },
            { key: 'orders', label: 'Đơn hàng', count: orders.length },
            { key: 'products', label: 'Sản phẩm', count: products.length },
            { key: 'customers', label: 'Khách hàng', count: customers.length },
            { key: 'inventory', label: 'Tồn kho', count: inventory.length },
          ]}
        >
          {tab === 'revenue' && (
            <ReportTable<RevenueReportRow>
              columns={revenueCols}
              rows={revenue}
              formatMoney
            />
          )}
          {tab === 'orders' && (
            <ReportTable<OrdersReportRow> columns={ordersCols} rows={orders} />
          )}
          {tab === 'products' && (
            <ReportTable<ProductsReportRow>
              columns={productsCols}
              rows={products}
              formatMoney
            />
          )}
          {tab === 'customers' && (
            <ReportTable<CustomersReportRow>
              columns={customersCols}
              rows={customers}
              formatMoney
            />
          )}
          {tab === 'inventory' && (
            <ReportTable<InventoryReportRow>
              columns={inventoryCols}
              rows={inventory}
            />
          )}
        </Tabs>
      )}
    </section>
  );
};

interface ReportTableProps<T> {
  columns: ExportColumn<T>[];
  rows: T[];
  formatMoney?: boolean;
}
function ReportTable<T extends object>({
  columns,
  rows,
  formatMoney,
}: ReportTableProps<T>): JSX.Element {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Không có dữ liệu trong khoảng này</h3>
        </CardHeader>
      </Card>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            {columns.map((c, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-medium"
                style={c.align ? { textAlign: c.align } : undefined}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-t border-neutral-100">
              {columns.map((c, ci) => {
                const raw = c.get
                  ? c.get(r)
                  : (r as Record<string, unknown>)[c.key as string];
                const isMoney =
                  formatMoney &&
                  (typeof raw === 'number' ||
                    String(c.key).toLowerCase().includes('revenue') ||
                    String(c.key).toLowerCase().includes('spend') ||
                    String(c.key).toLowerCase().includes('amount'));
                const display =
                  raw == null
                    ? ''
                    : isMoney && typeof raw === 'number'
                      ? formatVND(raw)
                      : String(raw);
                return (
                  <td
                    key={ci}
                    className="px-3 py-2"
                    style={c.align ? { textAlign: c.align } : undefined}
                  >
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}