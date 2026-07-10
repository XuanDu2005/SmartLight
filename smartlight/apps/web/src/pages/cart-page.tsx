import { Link } from 'react-router-dom';
import { Button, EmptyState } from '@smartlight/ui';

export const CartPage = (): JSX.Element => (
  <section className="container-page py-12">
    <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Giỏ hàng</h1>
    <EmptyState
      title="Giỏ hàng của bạn đang trống"
      description="Thêm sản phẩm vào giỏ để bắt đầu mua sắm."
      action={
        <Link to="/products">
          <Button variant="primary">Khám phá sản phẩm</Button>
        </Link>
      }
    />
  </section>
);