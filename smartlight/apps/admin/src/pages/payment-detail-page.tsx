import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Badge,
  Breadcrumb,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Spinner,
  StatusPill,
  Tabs,
  useToast,
} from '@smartlight/ui';
import { paymentsApi } from '../lib/payments-api';
import { formatVND } from '../lib/format';
import type { PaymentDetail } from '../lib/types';

export const PaymentDetailPage = (): JSX.Element => {
  const params = useParams<{ id: string }>();
  const { push } = useToast();
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('tx');

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await paymentsApi.getAdmin(params.id!);
        if (!cancelled) setPayment(data);
      } catch (e) {
        push({
          variant: 'error',
          title: 'Lỗi',
          description: e instanceof Error ? e.message : '',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, push]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!payment) {
    return (
      <section className="container-page py-6">
        <EmptyState title="Không tìm thấy thanh toán" />
      </section>
    );
  }

  return (
    <section className="container-page py-6">
      <Breadcrumb
        items={[
          { label: 'Admin', href: '/' },
          { label: 'Thanh toán', href: '/payments' },
          { label: payment.orderCode },
        ]}
        className="mb-3"
      />
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-2xl font-semibold">
          Giao dịch #{payment.id.slice(0, 8)}
        </h1>
        <StatusPill
          status={payment.status}
          variant={
            payment.status === 'SUCCEEDED'
              ? 'success'
              : payment.status === 'FAILED'
                ? 'danger'
                : payment.status === 'REFUNDED'
                  ? 'warning'
                  : 'info'
          }
        />
        <Badge variant="info">{payment.provider}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-semibold">Chi tiết</h2>
          </CardHeader>
          <CardBody>
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { key: 'tx', label: 'Giao dịch', count: payment.transactions.length },
                {
                  key: 'webhook',
                  label: 'Webhook',
                  count: payment.webhooks.length,
                },
              ]}
            >
              {tab === 'tx' &&
                (payment.transactions.length === 0 ? (
                  <EmptyState title="Chưa có giao dịch" />
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase tracking-wide text-neutral-500">
                      <tr>
                        <th className="px-2 py-2 text-left">Loại</th>
                        <th className="px-2 py-2 text-left">Trạng thái</th>
                        <th className="px-2 py-2 text-right">Số tiền</th>
                        <th className="px-2 py-2 text-left">Mã tham chiếu</th>
                        <th className="px-2 py-2 text-left">Ngày</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payment.transactions.map((t) => (
                        <tr key={t.id} className="border-t border-neutral-100">
                          <td className="px-2 py-2">{t.type}</td>
                          <td className="px-2 py-2">
                            <StatusPill
                              status={t.status}
                              variant={
                                t.status === 'SUCCESS'
                                  ? 'success'
                                  : t.status === 'FAILED'
                                    ? 'danger'
                                    : 'warning'
                              }
                            />
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">
                            {formatVND(t.amount?.amount ?? 0)}
                          </td>
                          <td className="px-2 py-2">
                            <code className="text-xs">
                              {t.providerReference ?? '—'}
                            </code>
                          </td>
                          <td className="px-2 py-2 text-xs text-neutral-600">
                            {new Date(t.createdAt).toLocaleString('vi-VN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))}
              {tab === 'webhook' &&
                (payment.webhooks.length === 0 ? (
                  <EmptyState title="Chưa có webhook" />
                ) : (
                  <ul className="divide-y divide-neutral-100 text-sm">
                    {payment.webhooks.map((w) => (
                      <li
                        key={w.id}
                        className="flex items-start justify-between py-2"
                      >
                        <div>
                          <p className="font-medium">
                            {w.eventType}{' '}
                            <StatusPill
                              status={w.processed ? 'Đã xử lý' : 'Chờ'}
                              variant={w.processed ? 'success' : 'warning'}
                            />
                            {!w.signatureValid && (
                              <StatusPill status="Sai chữ ký" variant="danger" />
                            )}
                          </p>
                          <pre className="mt-1 max-w-xl overflow-x-auto rounded bg-neutral-50 p-2 text-xs text-neutral-700">
                            {JSON.stringify(w.payload, null, 2)}
                          </pre>
                        </div>
                        <span className="ml-4 shrink-0 text-xs text-neutral-500">
                          {new Date(w.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </li>
                    ))}
                  </ul>
                ))}
            </Tabs>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Khách hàng</h2>
            </CardHeader>
            <CardBody className="space-y-1 text-sm">
              <p className="font-medium">{payment.customerName}</p>
              <p className="text-neutral-500">{payment.customerEmail}</p>
              <p className="text-xs text-neutral-400">ID: {payment.customerId}</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Số tiền</h2>
            </CardHeader>
            <CardBody className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Giá trị</span>
                <span className="tabular-nums">
                  {formatVND(payment.amount?.amount ?? 0)}
                </span>
              </div>
              {payment.refundedAmount && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Đã hoàn</span>
                  <span className="tabular-nums">
                    {formatVND(payment.refundedAmount.amount)}
                  </span>
                </div>
              )}
              {payment.failureReason && (
                <p className="rounded bg-red-50 p-2 text-xs text-red-700">
                  {payment.failureReason}
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-4 text-right text-sm">
        <Link to="/payments" className="text-smart-700 hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    </section>
  );
};