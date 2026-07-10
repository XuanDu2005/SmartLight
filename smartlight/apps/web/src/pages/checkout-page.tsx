import { EmptyState } from '@smartlight/ui';

export const CheckoutPage = (): JSX.Element => (
  <section className="container-page py-12">
    <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Thanh toán</h1>
    <EmptyState
      title="Sắp ra mắt"
      description="Chức năng thanh toán sẽ được kết nối với Cart API ở giai đoạn tiếp theo."
    />
  </section>
);